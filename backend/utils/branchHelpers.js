/**
 * Normalizes branch names to standard Class names.
 * Rules:
 * - CE, Computer, Computer Engineering -> CE
 * - IT, Information Technology -> IT
 * - AI, CE-AI, Computer Engineering - AI -> CE-AI
 * 
 * @param {string} branchName 
 * @returns {string} Normalized Class Name or original if no match
 */
const normalizeBranch = (branchName) => {
    if (!branchName) return '';

    const lower = branchName.toLowerCase().trim();

    // CE Group
    if (['ce', 'computer', 'computer engineering'].includes(lower)) {
        return 'CE';
    }

    // IT Group
    if (['it', 'information technology'].includes(lower)) {
        return 'IT';
    }

    // AI Group
    if (['ce-ai', 'ai', 'computer engineering - ai', 'computer engineering and artificial intelligence', 'ce - artificial intelligence'].includes(lower)) {
        return 'CE-AI';
    }

    return branchName; // Return original if no rule matches
};

module.exports = { normalizeBranch };
