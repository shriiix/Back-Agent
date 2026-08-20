const Groq = require("groq-sdk");

const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    throw new Error(
        "GROQ_API_KEY is missing from .env"
    );
}

const groq = new Groq({
    apiKey
});


const DEFAULT_MODEL =
    process.env.GROQ_MODEL ||
    "llama-3.3-70b-versatile";


async function generateMatch(
    systemPrompt,
    userPrompt
) {

    const response =
        await groq.chat.completions.create({

            model:
                DEFAULT_MODEL,

            temperature:
                0.1,

            max_tokens:
                2500,

            response_format: {
                type: "json_object"
            },

            messages: [

                {
                    role: "system",

                    content:
                        systemPrompt
                },

                {
                    role: "user",

                    content:
                        userPrompt
                }
            ]
        });


    const content =
        response
            ?.choices?.[0]
            ?.message
            ?.content;


    if (!content) {

        throw new Error(
            "Groq returned an empty response"
        );
    }


    try {

        return JSON.parse(
            content
        );

    } catch (error) {

        console.error(
            "❌ Groq returned invalid JSON:"
        );

        console.error(
            content
        );

        throw new Error(
            "Groq returned invalid JSON"
        );
    }
}


module.exports = {
    generateMatch,
    DEFAULT_MODEL
};