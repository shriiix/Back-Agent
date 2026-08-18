const axios = require("axios");

/**
 * Fetch published jobs from a Greenhouse job board.
 *
 * Greenhouse public Job Board API:
 * GET /v1/boards/{board_token}/jobs?content=true
 */
async function fetchGreenhouseJobs(boardToken) {
    if (!boardToken) {
        throw new Error("Greenhouse board token is required");
    }

    const url =
        `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;

    try {
        const response = await axios.get(url, {
            params: {
                content: true
            },
            timeout: 15000
        });

        return response.data?.jobs || [];
    } catch (error) {
        const status = error.response?.status;

        throw new Error(
            `Greenhouse API failed for "${boardToken}"` +
            (status ? ` (${status})` : "") +
            `: ${error.message}`
        );
    }
}

/**
 * Convert Greenhouse's response into our common Job structure.
 */
function normalizeJob(job, boardToken) {
    return {
        id: `greenhouse:${boardToken}:${job.id}`,

        source: "greenhouse",

        sourceId: String(job.id),

        company: job.company_name || boardToken,

        title: job.title || "",

        location: job.location?.name || "",

        remote: /remote/i.test(job.location?.name || ""),

        salary: null,

        description: job.content || "",

        url: job.absolute_url || "",

        applicationUrl: job.absolute_url || "",

        postedAt: job.first_published || null,

        updatedAt: job.updated_at || null,

        departments: job.departments || [],

        offices: job.offices || []
    };
}

/**
 * Fetch + normalize jobs from one Greenhouse company.
 */
async function collectGreenhouseJobs(boardToken) {
    const jobs = await fetchGreenhouseJobs(boardToken);

    return jobs
        .map(job => normalizeJob(job, boardToken))
        .filter(job => job.title && job.url);
}

module.exports = {
    fetchGreenhouseJobs,
    normalizeJob,
    collectGreenhouseJobs
};