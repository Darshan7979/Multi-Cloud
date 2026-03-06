const calculateSecurityScore = ({ fileCount, privateCount, cloudCount, emailVerified = true }) => {
  let score = 40; // Base score

  // +20 points for verified email
  if (emailVerified) {
    score += 20;
  }

  // +20 points for using multiple cloud providers (redundancy)
  if (cloudCount > 1) {
    score += 20;
  } else if (cloudCount === 1) {
    score += 10;
  }

  // +20 points for keeping files private (if they have files)
  if (fileCount > 0) {
    const privateRatio = privateCount / fileCount;
    score += Math.round(privateRatio * 20);
  } else {
    // If no files yet, give them the benefit of the doubt
    score += 20;
  }

  // Cap at 100
  return Math.min(score, 100);
};

module.exports = { calculateSecurityScore };
