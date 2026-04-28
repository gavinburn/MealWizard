import bcrypt from "bcrypt";
import dotenv from 'dotenv';
import crypto from 'crypto'; 
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}
import express from 'express'
import cors from 'cors'
import { PrismaClient } from "@prisma/client"
import { FitnessGoal, Gender, FitnessLevel, validateEnumValue } from '../common/constants.js'
const prisma = new PrismaClient()
const app = express()

import OpenAI from "openai"; 
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


import multer from 'multer';
import vision from '@google-cloud/vision';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});
const visionClient = new vision.ImageAnnotatorClient();
const allowed = [
  'http://localhost:5173',
  'https://www.mealwizard.ca',
  'https://mealwizard.ca',
  'https://gavin-michael-proj.vercel.app',
  /\.vercel\.app$/   // regex is supported by the cors package
];


//  AI receipt extraction helper 
async function aiExtractItemsFromReceipt(text) {
  if (!text || typeof text !== 'string' || !text.trim()) return { items: [] };

  // Strict schema to force normalized units + numbers
  const schema = {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            quantity: { type: "number" },
            unit: { type: "string", enum: ["g", "kg", "mL", "L"] }
          },
          required: ["name", "quantity", "unit"],
          additionalProperties: false
        }
      }
    },
    required: ["items"],
    additionalProperties: false
  };

  const system = [
    "You extract grocery items from noisy receipt text.",
    "Rules:",
    "- Output strictly valid JSON matching the provided schema (no markdown).",
    "- Normalize ALL units to only g, kg, mL, or L.",
    "- Convert decimals with comma or dot to a proper number.",
    "- Aggregate quantities for the same item name (case-insensitive).",
    "- Discard lines that are totals, taxes, payment, headers, or prices.",
    "- Keep concise, human-readable item names (e.g., 'tomatoes' -> 'tomato').",
    "- If a line shows quantity without a clear item, infer from surrounding context only if obvious; otherwise skip.",
  ].join("\n");

  const userContent = JSON.stringify({
    receiptText: text,
    jsonSchema: schema
  });

  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    response_format: { type: "json_object" },
    temperature: 0.2,
    messages: [
      { role: "system", content: system },
      { role: "user", content: userContent }
    ],
  });

  let parsed = { items: [] };
  try {
    parsed = JSON.parse(completion.choices?.[0]?.message?.content || "{}");
  } catch {
    // fall through to empty
  }

  // Basic post-validate & clamp
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  const clean = items
    .filter(it =>
      it &&
      typeof it.name === "string" &&
      Number.isFinite(Number(it.quantity)) &&
      ["g","kg","mL","L"].includes(it.unit)
    )
    .map(it => ({
      name: it.name.trim(),
      quantity: Math.round(Number(it.quantity) * 1000) / 1000,
      unit: it.unit
    }))
    .filter(it => it.name && it.quantity > 0);

  return { items: clean };
}




app.use(express.json());
// allow requests from your front-end origin
app.use(cors({ origin: allowed, credentials: true }));

app.get("/api", async (req, res) => {
  try {
    const users = await prisma.user.findMany()
    res.json(users)                    // sends JSON array to client
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'DB error' })
  }
})

app.post("/api/user", async (req, res) => {
  try {
    // Validate enum values
    try {
      validateEnumValue(req.body.fitnessGoal, FitnessGoal, 'fitnessGoal');
      validateEnumValue(req.body.gender, Gender, 'gender');
      validateEnumValue(req.body.fitnessLevel, FitnessLevel, 'fitnessLevel');
    } catch (enumError) {
      return res.status(400).json({ error: enumError.message });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 10); // 10 salt rounds

    const user = await prisma.user.create({
      data: {
        email: req.body.email,
        fitnessGoal: req.body.fitnessGoal,
        fitnessLevel: req.body.fitnessLevel,
        gender: req.body.gender,
        password: hashedPassword,   // store hash
        username: req.body.username,
        weight: req.body.weight,
        favoriteCuisines: req.body.favoriteCuisines
      },
    });

    // Send back the created user (without password)
    const { password, ...userWithoutPassword } = user
    res.status(201).json(userWithoutPassword)

  } catch (error) {
    console.error("Error creating user:", error)
    res.status(500).json({ error: "Failed to create user" })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // If email is unique in Prisma, prefer findUnique
    let user = null;
    try {
      user = await prisma.user.findUnique({ where: { email } });
    } catch {
      user = await prisma.user.findFirst({ where: { email } });
    }

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // 1) Primary check: proper bcrypt
    let ok = false;
    if (typeof user.password === 'string' && user.password.startsWith('$2')) {
      ok = await bcrypt.compare(password, user.password);
    } else {
      // 2) Migration path: legacy plaintext row
      if (user.password === password) {
        ok = true;
        // transparently upgrade to bcrypt
        try {
          const hashed = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 10);
          await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
        } catch (e) {
          // if update fails, still allow login this time
          console.warn('Password rehash failed; will retry on next login:', e);
        }
      }
    }

    if (!ok) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const { password: _omit, ...userSafe } = user;
    return res.json({ user: userSafe /*, token */ });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});


// PUT /api/user/:id  -> update a user
app.put('/api/user/:id', async (req, res) => {
  try {
    // keep id as string (UUID/cuid). If your Prisma model uses Int, change both client and DB to Int instead.
    const id = req.params.id?.toString();
    if (!id) return res.status(400).json({ error: 'Invalid user id' });

    const { fitnessGoal, gender, fitnessLevel, weight, favoriteCuisines, username } = req.body || {};

    // Only validate fields that are present
    try {
      if (fitnessGoal !== undefined) validateEnumValue(fitnessGoal, FitnessGoal, 'fitnessGoal');
      if (gender !== undefined) validateEnumValue(gender, Gender, 'gender');
      if (fitnessLevel !== undefined) validateEnumValue(fitnessLevel, FitnessLevel, 'fitnessLevel');
    } catch (enumError) {
      return res.status(400).json({ error: enumError.message });
    }

    const user = await prisma.user.update({
      where: { id }, // id is a string here
      data: {
        ...(username !== undefined ? { username } : {}),
        ...(fitnessGoal !== undefined ? { fitnessGoal } : {}),
        ...(fitnessLevel !== undefined ? { fitnessLevel } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(weight !== undefined ? { weight } : {}),
        ...(favoriteCuisines !== undefined ? { favoriteCuisines } : {}),
      },
    });

    const { password: _omit, ...safe } = user;
    res.json(safe);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
});


// DELETE /api/user/:id  -> delete user and related data
app.delete('/api/user/:id', async (req, res) => {
  const id = req.params.id?.toString();
  if (!id) return res.status(400).json({ error: 'Invalid user id' });

  try {
    // remove related data first (adjust if you have ON DELETE CASCADE)
    await prisma.favorite.deleteMany({ where: { userId: id } });
    await prisma.mealPlan.deleteMany({ where: { userId: id } });
    await prisma.ingredient.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    return res.status(204).end();
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET: list a user's ingredients
app.get('/api/user/:userId/ingredients', async (req, res) => {
  const { userId } = req.params;
  try {
    const list = await prisma.ingredient.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(list);
  } catch (err) {
    console.error('List ingredients error:', err);
    res.status(500).json({ error: 'Failed to fetch ingredients' });
  }
});

// POST: create a new ingredient for a user
app.post('/api/user/:userId/ingredients', async (req, res) => {
  const { userId } = req.params;
  const { name, quantity, unit } = req.body;

  if (!name || !quantity || !unit) {
    return res.status(400).json({ error: 'name, quantity, and unit are required' });
  }

  try {
    const created = await prisma.ingredient.create({
      data: { userId, name, quantity: Number(quantity), unit },
    });
    res.status(201).json(created);
  } catch (err) {
    console.error('Create ingredient error:', err);
    res.status(500).json({ error: 'Failed to create ingredient' });
  }
});

app.patch('/api/ingredients/:id', async (req, res) => {
  const { id } = req.params;
  let { quantity, unit, name } = req.body || {};
  try {
    // If both unit and quantity provided, normalize them
    if (unit && (quantity ?? null) !== null) {
      const norm = normalizeQtyUnit(quantity, unit);
      quantity = norm.quantity;
      unit = norm.unit;
    } else if (quantity != null) {
      // If only quantity changes, normalize with existing unit
      const current = await prisma.ingredient.findUnique({ where: { id } });
      if (!current) return res.status(404).json({ error: 'Not found' });
      const norm = normalizeQtyUnit(quantity, current.unit);
      quantity = norm.quantity;
      unit = norm.unit;
    }

    const updated = await prisma.ingredient.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(unit ? { unit } : {}),
        ...(quantity != null ? { quantity } : {}),
      },
    });
    res.json(updated);
  } catch (e) {
    console.error('Update ingredient error:', e);
    res.status(500).json({ error: 'Failed to update ingredient' });
  }
});

// DELETE: remove a single ingredient (scoped to the owner)
app.delete('/api/user/:userId/ingredients/:ingredientId', async (req, res) => {
  const { userId, ingredientId } = req.params;

  try {
    // Ensure the ingredient belongs to this user
    const existing = await prisma.ingredient.findFirst({
      where: { id: ingredientId, userId }
    });
    if (!existing) {
      return res.status(404).json({ error: 'Ingredient not found' });
    }

    await prisma.ingredient.delete({ where: { id: ingredientId } });
    res.status(204).end(); // No content
  } catch (err) {
    console.error('Delete ingredient error:', err);
    res.status(500).json({ error: 'Failed to delete ingredient' });
  }
});

// helper: fetch profile + pantry
async function getUserContext(prisma, userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');

  const ingredients = await prisma.ingredient.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  return { user, ingredients };
}

// POST /api/meal-plans/generate
app.post('/api/meal-plans/generate', async (req, res) => {
  try {
    const { userId, durationDays, mealsPerDay } = req.body || {};
    if (!userId || !durationDays || !mealsPerDay) {
      return res.status(400).json({ error: 'userId, durationDays, mealsPerDay are required' });
    }

    const { user, ingredients } = await getUserContext(prisma, userId);

    // Build a compact pantry list for the model
    const pantry = ingredients.map(i => ({
      id: i.id, name: i.name, quantity: i.quantity, unit: i.unit
    }));

    // Calories target heuristic with activity, gender & goal + per-plan fraction
    const goal   = (user.fitnessGoal  || '').toLowerCase();
    const level  = (user.fitnessLevel || '').toLowerCase();
    const gender = (user.gender       || '').toLowerCase();
    const weightLbs = Number(user.weight || 170);

    // Activity multipliers (TDEE-ish)
    const activityMultiplier =
      level.includes('very') ? 1.9 :
      (level.includes('active') && !level.includes('very')) ? 1.725 :
      level.includes('moderate') ? 1.55 :
      level.includes('light') ? 1.375 :
      1.2; // sedentary default

    // Gender factor (simple heuristic; female ~10% lower TDEE on average)
    const genderFactor = gender.includes('female') ? 0.90 : 1.00;

    // Rough maintenance proxy with activity & gender
    let maintenanceCalories = 14 * weightLbs * activityMultiplier * genderFactor;

    // Goal adjustment
    let goalFactor = 1.0;
    if (goal.includes('cut'))  goalFactor = 0.85;
    if (goal.includes('bulk')) goalFactor = 1.10;

    // Plan coverage fraction based on meals/day covered by this plan
    const mpd = Number(mealsPerDay);
    const planFraction = (mpd === 1) ? (1/3) : (mpd === 2) ? (2/3) : 1.0;

    // Final daily calories to target for THIS PLAN
    const targetCaloriesPerDay = Math.round(maintenanceCalories * goalFactor * planFraction);
    const cuisines = Array.isArray(user.favoriteCuisines) ? user.favoriteCuisines : [];

    // Force a strict JSON schema for easier frontend rendering & deduction math
    const schema = {
      type: "object",
      properties: {
        meta: {
          type: "object",
          properties: {
            durationDays: { type: "number" },
            mealsPerDay: { type: "number" },
            targetCaloriesPerDay: { type: "number" },
            cuisineStyle: { type: "string" }
          },
          required: ["durationDays", "mealsPerDay", "targetCaloriesPerDay", "cuisineStyle"]
        },
        days: {
          type: "array",
          items: {
            type: "object",
            properties: {
              day: { type: "number" },
              meals: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    calories: { type: "number" },
                    instructions: { type: "string" },
                    uses: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          quantity: { type: "number" },
                          unit: { type: "string" }
                        },
                        required: ["name", "quantity", "unit"]
                      }
                    }
                  },
                  required: ["title", "calories", "uses"]
                }
              }
            },
            required: ["day", "meals"]
          }
        },
        usedIngredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              quantity: { type: "number" },
              unit: { type: "string" }
            },
            required: ["name", "quantity", "unit"]
          }
        }
      },
      required: ["meta", "days", "usedIngredients"]
    };

    const system = `You are a meal plan generator. Only use pantry items provided.
    - Do NOT invent ingredients that are not in the pantry list (names must match).
    - Respect cuisine preferences if possible.
    - Spread macros/calories roughly evenly across days/meals to hit the provided targetCaloriesPerDay for THIS PLAN ONLY (the user may eat other calories elsewhere).
    - Output strictly valid JSON (no comments or trailing commas) matching the provided JSON schema.
    - If an ingredient runs out, do not use it again.`;

    const requestMeta = {
      durationDays,
      mealsPerDay,
      targetCaloriesPerDay,
      cuisineHint: cuisines[0] || "Any",
      // additional meta for client visibility / debugging
      planCalorieFraction: planFraction,                  // 1, 2/3, or 1/3
      fullDailyCaloriesEstimate: Math.round(maintenanceCalories * goalFactor), // total for whole day
      activityMultiplier,
      goalFactor
    };
    
    const userMsg = {
      role: "user",
      content: JSON.stringify({
        profile: {
          weightLbs,
          fitnessGoal: user.fitnessGoal,
          fitnessLevel: user.fitnessLevel,
          favoriteCuisines: cuisines
        },
        pantry,
        request: requestMeta,
        jsonSchema: schema
      })
    };

    // OpenAI JSON mode (responses.tool style or response_format:{type:'json_object'}) – keep generic:
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        userMsg
      ],
      temperature: 0.6,
    });

    let parsed;
    try {
      parsed = JSON.parse(completion.choices[0].message.content);
    } catch {
      return res.status(502).json({ error: "Model did not return valid JSON" });
    }

    // Quick structural check
    if (!parsed?.days || !Array.isArray(parsed.days)) {
      return res.status(502).json({ error: "Invalid plan structure" });
    }

    return res.json(parsed);
  } catch (err) {
    console.error('Generate plan error:', err);
    return res.status(500).json({ error: 'Failed to generate plan' });
  }
});

// POST /api/meal-plans/accept
app.post('/api/meal-plans/accept', async (req, res) => {
  const { userId, name, plan } = req.body || {};
  if (!userId || !plan || !Array.isArray(plan.usedIngredients)) {
    return res.status(400).json({ error: 'userId and plan.usedIngredients are required' });
  }

  try {
    // 1) Deduct pantry with unit-awareness
    for (const u of plan.usedIngredients) {
      let { name, unit, quantity } = u;
      if (!name || !unit || !quantity) continue;

      // find all rows with same name & same unit group for this user
      const groupName = unitGroupOf(unit);
      const candidates = await prisma.ingredient.findMany({
        where: { userId, name },
        orderBy: { createdAt: 'asc' },
      });

      // filter by same group (kg/g/mg with kg/g/mg, L with mL, etc.)
      const sameGroup = candidates.filter(r => unitGroupOf(r.unit) === groupName);
      if (!sameGroup.length) continue;

      // We’ll deduct from the first matching row (or spread across rows if you prefer)
      const row = sameGroup[0];

      // convert both to base (g or mL) and deduct
      const rowBase = toBaseQty(row.quantity, row.unit);
      const useBase = toBaseQty(quantity, unit);
      const newBase = Math.max(0, rowBase - useBase);

      if (newBase === 0) {
        await prisma.ingredient.delete({ where: { id: row.id } });
      } else {
        // normalize back to a sensible unit (e.g., 0.5 kg -> 500 g)
        const { quantity: normalizedQty, unit: normalizedUnit } = fromBaseAndNormalize(newBase, groupName);
        await prisma.ingredient.update({
          where: { id: row.id },
          data: { quantity: normalizedQty, unit: normalizedUnit },
        });
      }
    }

    // 2) Persist the plan
    const saved = await prisma.mealPlan.create({
      data: {
        userId,
        name: (typeof name === 'string' && name.trim()) ? name.trim() : `Plan ${new Date().toLocaleDateString()}`,
        status: 'ACTIVE',
        planJson: plan, // raw JSON blob you generated
      }
    });

    // 3) Return updated pantry + saved plan
    const updatedPantry = await prisma.ingredient.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ ok: true, pantry: updatedPantry, savedPlan: saved });
  } catch (err) {
    console.error('Accept plan error:', err);
    return res.status(500).json({ error: 'Failed to accept plan' });
  }
});

app.get('/api/diag/openai', async (req, res) => {
  try {
    const r = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [{ role: 'user', content: 'ping' }],
      max_tokens: 5
    });
    res.json({ ok: true, id: r.id, model: r.model });
  } catch (err) {
    res.status(500).json({
      ok: false,
      status: err?.status,
      code: err?.code || err?.error?.code,
      message: err?.message,
      details: err?.response?.data || err?.error,
    });
  }
});


// GET: list user's meal plans (optionally filter by status via ?status=ACTIVE|DONE)
app.get('/api/user/:userId/meal-plans', async (req, res) => {
  const { userId } = req.params;
  const status = req.query.status;
  try {
    const plans = await prisma.mealPlan.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
    });
    res.json(plans);
  } catch (err) {
    console.error('List meal plans error:', err);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});

// PATCH: update plan status or rename
app.patch('/api/meal-plans/:planId', async (req, res) => {
  const { planId } = req.params;
  const { status, name } = req.body || {};
  if (!status && !name) return res.status(400).json({ error: 'Nothing to update' });
  try {
    const updated = await prisma.mealPlan.update({
      where: { id: planId },
      data: {
        ...(status ? { status } : {}),
        ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      },
    });
    res.json(updated);
  } catch (err) {
    console.error('Update meal plan error:', err);
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
});

// DELETE: remove a meal plan permanently
app.delete('/api/meal-plans/:planId', async (req, res) => {
  const { planId } = req.params;
  try {
    await prisma.mealPlan.delete({ where: { id: planId } });
    res.status(204).end();
  } catch (err) {
    console.error('Delete meal plan error:', err);
    // If it was already deleted, treat as success
    if (err.code === 'P2025') return res.status(204).end();
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
});

// ===== Favorites (Meal Plans) =====

// GET: list a user's favourite meal plans (with preview info)
app.get('/api/user/:userId/favorites', async (req, res) => {
  const { userId } = req.params;
  try {
    const favs = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true }, // include MealPlan (has .name, .status, .planJson)
    });

    const previews = favs.map(f => {
      const plan = f.plan;
      const meta = (plan?.planJson && plan.planJson.meta) ? plan.planJson.meta : {};
      const days = Number(meta?.durationDays ?? plan?.planJson?.days?.length ?? 0);
      const mealsPerDay = Number(meta?.mealsPerDay ?? (Array.isArray(plan?.planJson?.days?.[0]?.meals) ? plan.planJson.days[0].meals.length : 0));
      const totalMeals = (days && mealsPerDay) ? days * mealsPerDay : 0;
      const calories = Number(meta?.targetCaloriesPerDay ?? 0);

      return {
        id: f.id,
        planId: plan.id,
        name: plan.name,
        status: plan.status,
        createdAt: f.createdAt,
        preview: {
          durationDays: days,
          mealsPerDay,
          totalMeals,
          targetCaloriesPerDay: calories,
          cuisineStyle: meta?.cuisineStyle || null
        }
      };
    });

    res.json(previews);
  } catch (err) {
    console.error('List favorites error:', err);
    res.status(500).json({ error: 'Failed to fetch favourites' });
  }
});

// POST: favourite a meal plan
app.post('/api/meal-plans/:planId/favorite', async (req, res) => {
  const { planId } = req.params;
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    // ensure plan exists and belongs to the same user
    const plan = await prisma.mealPlan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Meal plan not found' });
    if (plan.userId !== userId) return res.status(403).json({ error: 'Not your plan' });

    const fav = await prisma.favorite.upsert({
      where: { userId_planId: { userId, planId } },
      update: {},
      create: { userId, planId },
    });

    res.status(201).json(fav);
  } catch (err) {
    console.error('Create favorite error:', err);
    res.status(500).json({ error: 'Failed to favourite meal plan' });
  }
});

// DELETE: unfavourite a meal plan
app.delete('/api/meal-plans/:planId/favorite', async (req, res) => {
  const { planId } = req.params;
  const userId = req.query.userId?.toString();
  if (!userId) return res.status(400).json({ error: 'userId is required' });
  try {
    await prisma.favorite.delete({
      where: { userId_planId: { userId, planId } },
    });
    res.status(204).end();
  } catch (err) {
    if (err.code === 'P2025') return res.status(204).end(); // already gone
    console.error('Delete favorite error:', err);
    res.status(500).json({ error: 'Failed to unfavourite meal plan' });
  }
});


app.post('/api/receipts/parse', upload.single('file'), async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // 1) OCR with Google Vision
    const [result] = await visionClient.documentTextDetection({
      image: { content: req.file.buffer }
    });
    const text = result?.fullTextAnnotation?.text || '';

    // 2) Parse with OpenAI (no fallback)
    let items = [];
    try {
      const ai = await aiExtractItemsFromReceipt(text);
      items = ai.items || [];
    } catch (e) {
      console.error('AI parse failed:', e);
    }

    // 3) Always respond with same shape
    const payload = {
      provider: 'openai',
      items,
      ocrText: text,
    };

    if (!Array.isArray(items) || items.length === 0) {
      payload.items = [];
      payload.notice = 'NO_ITEMS'; // tells UI to handle gracefully
    }

    return res.json(payload);
  } catch (err) {
    console.error('Receipt parse error:', err);
    return res.status(500).json({ error: 'Failed to parse receipt' });
  }
});


// BULK: create many ingredients for a user at once
app.post('/api/user/:userId/ingredients/bulk', async (req, res) => {
  const { userId } = req.params;
  const { items } = req.body || {};

  if (!userId) return res.status(400).json({ error: 'Invalid user id' });
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items (array) is required' });
  }

  try {
    const allowedUnits = new Set(['g', 'kg', 'mL', 'L']);
    const cleaned = items
      .map(it => ({
        name: String(it?.name || '').trim(),
        quantity: Number(it?.quantity),
        unit: String(it?.unit || ''),
      }))
      .filter(it => it.name && Number.isFinite(it.quantity) && it.quantity > 0 && allowedUnits.has(it.unit));

    if (cleaned.length === 0) {
      return res.status(400).json({ error: 'No valid items to import' });
    }

    // Create each item, normalizing qty+unit to your base rules
    const created = [];
    for (const it of cleaned) {
      const norm = normalizeQtyUnit(it.quantity, it.unit); // uses helpers defined below in this file
      const row = await prisma.ingredient.create({
        data: {
          userId,
          name: it.name,
          quantity: norm.quantity,
          unit: norm.unit,
        },
      });
      created.push(row);
    }

    // Return the created rows so the client can append to its list
    return res.status(201).json(created);
  } catch (err) {
    console.error('Bulk create ingredients error:', err);
    return res.status(500).json({ error: 'Failed to import ingredients' });
  }
});



app.post('/api/auth/demo', async (req, res) => {
  try {
    const suffix = Math.random().toString(36).slice(2, 8).toLowerCase();
    const email = `demo+${suffix}@mealwizard.ca`;
    const username = `DemoUser_${suffix}`;
    const randomPassword = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(randomPassword, 10);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: passwordHash,
        weight: 170, // kg
        fitnessGoal: 'MAINTAINING', // Prisma enum value
        gender: 'MALE',
        fitnessLevel: 'MODERATE',
        favoriteCuisines: ['Italian', 'Mexican', 'Japanese'],
      },
      select: {
        id: true, username: true, email: true, weight: true,
        fitnessGoal: true, gender: true, fitnessLevel: true,
        favoriteCuisines: true, createdAt: true, updatedAt: true,
      }
    });

    await prisma.ingredient.createMany({
      data: [
        { userId: user.id, name: 'Chicken breast', quantity: 0.6, unit: 'kg' },
        { userId: user.id, name: 'Jasmine rice', quantity: 1.2, unit: 'kg' },
        { userId: user.id, name: 'Olive oil', quantity: 0.4, unit: 'L' },
        { userId: user.id, name: 'Black beans', quantity: 0.8, unit: 'L' }, // 2x400mL cans
        { userId: user.id, name: 'Spinach', quantity: 0.12, unit: 'kg' },
        { userId: user.id, name: 'Greek yogurt', quantity: 0.5, unit: 'kg' },
        { userId: user.id, name: 'Tomatoes', quantity: 0.4, unit: 'kg' },
        { userId: user.id, name: 'Garlic', quantity: 0.06, unit: 'kg' },
        { userId: user.id, name: 'Parmesan', quantity: 0.09, unit: 'kg' },
        { userId: user.id, name: 'Eggs', quantity: 12, unit: 'g' }, // if you support counts, swap to your count unit
      ]
    });


    // 5) respond with the created demo user; client will stash userId/email in localStorage
    return res.status(201).json({ user, demo: true });
  } catch (err) {
    console.error('Demo auth error:', err);
    return res.status(500).json({ error: 'Failed to create demo user' });
  }
});




// --- Unit normalization helpers ---
const UNIT_GROUPS = {
  mass: { order: ['g', 'kg'], factorsToBase: { g: 1, kg: 1000 }, base: 'g' },
  volume: { order: ['mL', 'L'], factorsToBase: { mL: 1, L: 1000 }, base: 'mL' },
};

function unitGroupOf(unit) {
  if (['g', 'kg'].includes(unit)) return 'mass';
  if (['mL', 'L'].includes(unit)) return 'volume';
  throw new Error(`Unsupported unit: ${unit}`); // enforce only these units
}

function toBaseQty(qty, unit) {
  const group = UNIT_GROUPS[unitGroupOf(unit)];
  return Number(qty) * group.factorsToBase[unit];
}

function fromBaseAndNormalize(baseQty, groupName) {
  const group = UNIT_GROUPS[groupName];
  if (groupName === 'mass') {
    if (baseQty >= 1000) return { quantity: baseQty / 1000, unit: 'kg' }; // promote to kg
    return { quantity: baseQty, unit: 'g' };                              // keep g
  }
  if (groupName === 'volume') {
    if (baseQty >= 1000) return { quantity: baseQty / 1000, unit: 'L' };  // promote to L
    return { quantity: baseQty, unit: 'mL' };                             // keep mL
  }
  throw new Error(`Unknown group: ${groupName}`);
}

function normalizeQtyUnit(qty, unit) {
  const groupName = unitGroupOf(unit);
  const baseQty = toBaseQty(qty, unit);
  const { quantity, unit: newUnit } = fromBaseAndNormalize(baseQty, groupName);
  return { quantity: Math.round(quantity * 100) / 100, unit: newUnit };
}
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => { console.log(`Server started on port ${PORT}`) });