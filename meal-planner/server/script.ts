import { PrismaClient } from "./src/generated/prisma"
const prisma = new PrismaClient()

async function  main() {
    const user = await prisma.user.create({
        data: {
            email: "michaeltuccillo5@gmail.com",
            fitnessGoal: "CUTTING",
            fitnessLevel: "ACTIVE",
            gender: "MALE",
            password: "testing",
            username: "michael",
            weight: 155,
            favoriteCuisines: ["Italian"]
        },
    })

}

main()
    .catch(e => {
        console.error(e.message)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })