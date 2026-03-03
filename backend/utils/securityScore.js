const calculateSecurityScore = ({ fileCount, privateCount, cloudCount }) => {
  if (fileCount === 0) {
    return 50;
  }

  const privateRatio = privateCount / fileCount;
  let score = 40;
  score += Math.round(privateRatio * 30);
  score += cloudCount > 1 ? 20 : 10;
  score += fileCount >= 10 ? 10 : 0;

  if (score > 100) {
    score = 100;
  }

  return score;
};

module.exports = { calculateSecurityScore };
