// Các hàm kiểm tra dữ liệu đầu vào dùng chung cho toàn backend
const isValidEmail = (email) => {
  if (typeof email !== "string" || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
};

const isValidPassword = (password) => {
  return typeof password === "string" && password.length >= 6;
};

const isValidName = (name) => {
  return typeof name === "string" && name.trim().length >= 2;
};

const isValidTitle = (title) => {
  return typeof title === "string" && title.trim().length > 0 && title.trim().length <= 100;
};

module.exports = {
  isValidEmail,
  isValidPassword,
  isValidName,
  isValidTitle,
};
