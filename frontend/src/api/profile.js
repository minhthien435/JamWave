import apiClient from "./client";

export const fetchProfile = async () => {
  const response = await apiClient.get("/profile");
  return response.data;
};
