const {
    matchJob
} = require("./job-matcher");

const {
    saveAIMatch
} = require("../db/database");


function sleep(ms) {
    return new Promise(
        resolve => setTimeout(resolve, ms)
    );
}


/*
|--------------------------------------------------------------------------
| PHASE 4 — BATCH AI MATCHING
|--------------------------------------------------------------------------
|
| Phase 3 now returns:
|
| candidates = [
|     job,
|     job,
|     job
| ]
|
| Each job contains:
|
| job.phase3 = {
|     careerTrack,
|     roleMatch,
|     seniority,
|     locationType,
|     priorityScore
| }
|
|--------------------------------------------------------------------------
*/


async function runBatchMatching(
    candidate,
    candidates,
    options = {}
) {

    const delayMs =
        options.delayMs ?? 1500;


    const results = [];

    let successful = 0;
    let failed = 0;


    console.log(
        "\n================================="
    );

    console.log(
        "🤖 STARTING GROQ BATCH ANALYSIS"
    );

    console.log(
        "================================="
    );


    // ==================================================
    // Validate candidate queue
    // ==================================================

    if (
        !Array.isArray(candidates)
    ) {

        throw new TypeError(
            "Phase 4 expected candidates to be an array."
        );
    }


    if (
        candidates.length === 0
    ) {

        console.log(
            "⚠️ No candidates available for AI analysis."
        );

        return {

            results: [],

            ranked: [],

            summary: {

                total: 0,

                successful: 0,

                failed: 0,

                strongMatch: 0,

                goodMatch: 0,

                review: 0,

                weakMatch: 0,

                skip: 0
            }
        };
    }


    // ==================================================
    // Process candidates
    // ==================================================

    for (
        let i = 0;
        i < candidates.length;
        i++
    ) {

        /*
         * IMPORTANT:
         *
         * Phase 3 now returns the job directly.
         *
         * Old:
         * const phase3Result = candidates[i];
         * const job = phase3Result.job;
         *
         * New:
         */

        const job =
            candidates[i];


        if (!job) {

            console.error(
                `\n[${i + 1}/${candidates.length}] ❌ Invalid candidate`
            );


            failed++;


            results.push({

                job: null,

                phase3: null,

                success: false,

                error:
                    "Candidate job is undefined."
            });


            continue;
        }


        console.log(
            `\n[${i + 1}/${candidates.length}] ${job.title}`
        );


        console.log(
            `   Company: ${
                job.company || "N/A"
            }`
        );


        console.log(
            `   Location: ${
                job.location || "N/A"
            }`
        );


        console.log(
            `   Phase 3 Track: ${
                job.phase3?.careerTrack ||
                "unknown"
            }`
        );


        console.log(
            `   Phase 3 Location: ${
                job.phase3?.locationType ||
                "UNKNOWN"
            }`
        );


        console.log(
            `   Phase 3 Priority: ${
                job.phase3?.priorityScore ??
                "N/A"
            }`
        );


        try {

            // ==========================================
            // Send job to Groq
            // ==========================================

            const match =
                await matchJob(
                    candidate,
                    job
                );


            // ==========================================
            // Validate AI response
            // ==========================================

            if (
                !match ||
                typeof match !== "object"
            ) {

                throw new Error(
                    "AI matcher returned an invalid result."
                );
            }


            // ==========================================
            // Save AI result immediately
            // ==========================================

            await saveAIMatch(
                job.id,
                match
            );


            successful++;


            results.push({

                job,

                /*
                 * Keep Phase 3 information available
                 * to Phase 4 ranking/output.
                 */
                phase3:
                    job.phase3 || null,

                match,

                success: true
            });


            console.log(
                "   💾 Saved AI result"
            );


            console.log(
                `   🎯 Score: ${
                    match.score ?? "N/A"
                }/100`
            );


            console.log(
                `   📌 ${
                    match.recommendation ||
                    "UNKNOWN"
                }`
            );


        } catch (error) {

            failed++;


            results.push({

                job,

                phase3:
                    job.phase3 || null,

                success: false,

                error:
                    error?.message ||
                    String(error)
            });


            console.error(
                `   ❌ Failed: ${
                    error?.message ||
                    error
                }`
            );
        }


        // ==========================================
        // Delay between Groq calls
        // ==========================================

        if (
            i <
            candidates.length - 1 &&
            delayMs > 0
        ) {

            await sleep(
                delayMs
            );
        }
    }


    // ==================================================
    // Ranking
    // ==================================================

    const ranked =
        results
            .filter(
                result =>
                    result.success &&
                    result.match
            )
            .sort(
                (a, b) => {

                    const scoreA =
                        Number(
                            a.match.score
                        ) || 0;

                    const scoreB =
                        Number(
                            b.match.score
                        ) || 0;

                    return (
                        scoreB -
                        scoreA
                    );
                }
            );


    // ==================================================
    // Recommendation counter
    // ==================================================

    const count =
        recommendation => {

            return ranked.filter(
                item =>
                    String(
                        item.match
                            ?.recommendation ||
                        ""
                    ).toUpperCase() ===
                    recommendation
            ).length;
        };


    // ==================================================
    // Summary
    // ==================================================

    const summary = {

        total:
            candidates.length,

        successful,

        failed,

        strongMatch:
            count(
                "STRONG_MATCH"
            ),

        goodMatch:
            count(
                "GOOD_MATCH"
            ),

        review:
            count(
                "REVIEW"
            ),

        weakMatch:
            count(
                "WEAK_MATCH"
            ),

        skip:
            count(
                "SKIP"
            )
    };


    // ==================================================
    // Final batch result
    // ==================================================

    return {

        results,

        ranked,

        summary
    };
}


module.exports = {

    runBatchMatching
};