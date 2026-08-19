import apiClient from "./client";

export const fetchProfile = async () => {
  const response = await apiClient.get("/profile");
  return response.data;
};

// Cập nhật tên hiển thị
export const updateProfile = async ({ name }) => {
  const response = await apiClient.patch("/profile", { name });
  return response.data;
};

// Upload avatar mới
export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  const response = await apiClient.post("/profile/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
