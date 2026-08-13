import apiClient from "./client";

export const fetchWrapped = async (period = "all") => {
  const response = await apiClient.get("/wrapped", { params: { period } });
  return response.data;
};