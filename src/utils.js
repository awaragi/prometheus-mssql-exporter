/**
 * Utility functions
 */
const productVersionParse = (version) => {
  const pattern = /^([0-9]+)\.([0-9]+)\.([0-9]+)\.([0-9]+)$/;
  const match = version.match(pattern);
  if (!match) throw new Error("Invalid product version " + version);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    build: Number(match[4]),
  };
};

module.exports = {
  productVersionParse,
};
