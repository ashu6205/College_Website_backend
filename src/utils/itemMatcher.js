const stringSimilarity = require('string-similarity');

const MATCH_WEIGHTS = {
    category: 30,
    location: 25,
    dateProximity: 20,
    description: 15,
    tags: 10
};

// Calculate date proximity score
const calculateDateProximity = (date1, date2) => {
    if (!date1 || !date2) return 0;
    const diffDays = Math.abs((new Date(date1) - new Date(date2)) / (1000 * 60 * 60 * 24));
    if (diffDays <= 1) return 1;
    if (diffDays <= 3) return 0.8;
    if (diffDays <= 7) return 0.6;
    if (diffDays <= 14) return 0.4;
    if (diffDays <= 30) return 0.2;
    return 0;
};

// Main matching function
exports.findPotentialMatches = (targetItem, itemPool) => {
    console.log("🚀 Target Item:", targetItem);
    console.log("🔍 Item Pool Size:", itemPool.length);

    const matches = itemPool
        .filter(item => {
            if (!item._id || !targetItem._id) return false;
            console.log("Comparing IDs:", item._id.toString(), targetItem._id.toString());
            return item._id.toString() !== targetItem._id.toString();
        })
        .map(item => {
            let score = 0;
            let matchDetails = {};

            // Category matching
            console.log(`Comparing category: ${item.category} === ${targetItem.category}`);
            if (item.category && targetItem.category && item.category === targetItem.category) {
                score += MATCH_WEIGHTS.category;
                matchDetails.category = 'Exact category match';
            }

            // Location similarity
            const location1 = item.location ? item.location.toLowerCase() : "";
            const location2 = targetItem.location ? targetItem.location.toLowerCase() : "";
            const locationSimilarity = stringSimilarity.compareTwoStrings(location1, location2);
            console.log(`Location Similarity (${item.location} vs ${targetItem.location}):`, locationSimilarity);
            score += MATCH_WEIGHTS.location * locationSimilarity;
            matchDetails.location = `Location similarity: ${Math.round(locationSimilarity * 100)}%`;

            // Date proximity
            console.log("Date Comparison:", item.date, targetItem.date);
            const dateScore = calculateDateProximity(item.date, targetItem.date);
            console.log("Date Proximity Score:", dateScore);
            score += MATCH_WEIGHTS.dateProximity * dateScore;
            matchDetails.date = `Date proximity score: ${Math.round(dateScore * 100)}%`;

            // Description similarity
            const desc1 = item.description ? item.description.toLowerCase() : "";
            const desc2 = targetItem.description ? targetItem.description.toLowerCase() : "";
            const descriptionSimilarity = stringSimilarity.compareTwoStrings(desc1, desc2);
            console.log("Description Similarity:", descriptionSimilarity);
            score += MATCH_WEIGHTS.description * descriptionSimilarity;
            matchDetails.description = `Description similarity: ${Math.round(descriptionSimilarity * 100)}%`;

            // Tags matching
            if (Array.isArray(item.tags) && Array.isArray(targetItem.tags)) {
                const commonTags = item.tags.filter(tag => targetItem.tags.includes(tag));
                console.log("Common Tags:", commonTags);
                const tagScore = commonTags.length / Math.max(item.tags.length, targetItem.tags.length);
                score += MATCH_WEIGHTS.tags * tagScore;
                matchDetails.tags = commonTags.length > 0 ? `Matching tags: ${commonTags.join(', ')}` : "No common tags";
            }

            console.log(`🔹 Item ${item._id} Score: ${Math.round(score)}`, matchDetails);

            return {
                item,
                score: Math.round(score),
                matchDetails
            };
        })
        .filter(match => {
            console.log(`Filtering: ${match.item._id}, Score: ${match.score}`);
            return match.score > 10; // Reduced from 30 to see low-scoring matches
        })
        .sort((a, b) => b.score - a.score);

    console.log("🏆 Final Matches:", matches.length > 0 ? matches : "No matches found");

    return matches;
};
