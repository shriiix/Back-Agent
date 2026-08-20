require("dotenv").config();

const {
    generateMatch,
    DEFAULT_MODEL
} = require("./providers/groq");


async function main() {

    console.log(
        "================================="
    );

    console.log(
        "🧪 GROQ CONNECTION TEST"
    );

    console.log(
        "================================="
    );


    console.log(
        `Model: ${DEFAULT_MODEL}`
    );


    const result =
        await generateMatch(

            "You are a job matching assistant. Return JSON only.",

            `
Return exactly this JSON:

{
  "status": "SUCCESS",
  "message": "Groq connection works"
}
`
        );


    console.log(
        "\n✅ GROQ RESPONSE"
    );

    console.log(
        JSON.stringify(
            result,
            null,
            2
        )
    );


    console.log(
        "\n✅ GROQ CONNECTION WORKING"
    );
}


main().catch(
    error => {

        console.error(
            "\n❌ GROQ TEST FAILED"
        );

        console.error(
            error.message
        );

        process.exit(1);
    }
);