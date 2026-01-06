const formatDateOnly = (date) => {
  if (!date) return null;
  return date.toISOString().split("T")[0];
};

module.exports = {
  formatDateOnly,
};
