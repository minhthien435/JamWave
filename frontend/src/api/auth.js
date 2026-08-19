import apiClient from "./client";

export const login = async (email, password, captchaToken) => {
  const response = await apiClient.post("/auth/login", { email, password, captchaToken });
  return response.data;
};

export const register = async (name, email, password, confirmPassword, captchaToken) => {
  const response = await apiClient.post("/auth/register", { name, email, password, confirmPassword, captchaToken });
  return response.data;
};

export const verifyEmail = async (token) => {
  const response = await apiClient.post("/auth/verify-email", { token });
  return response.data;
};

export const resendVerification = async (email) => {
  const response = await apiClient.post("/auth/resend-verification", { email });
  return response.data;
};

export const googleLogin = async (idToken) => {
  const response = await apiClient.post("/auth/google", { idToken });
  return response.data;
};

export const fetchMe = async () => {
  const response = await apiClient.get("/auth/me");
  return response.data;
};