import { pb } from "@/services/pb/client";

export type AdminMemberUser = {
  id: string;
  name: string;
  email: string;
  role: "member";
};

type AdminUsersResponse = {
  ok: boolean;
  users: AdminMemberUser[];
};

type UpdateMemberPasswordResponse = {
  ok: boolean;
  user: AdminMemberUser;
};

type UpdateMemberPasswordPayload = {
  userId: string;
  password: string;
  passwordConfirm: string;
};

const getErrorMessage = (err: unknown, fallbackMessage: string) => {
  if (!err || typeof err !== "object") {
    return fallbackMessage;
  }

  const anyErr = err as {
    message?: string;
    data?: { message?: string; error?: string; details?: string };
    response?: {
      data?: { message?: string; error?: string; details?: string };
    };
  };

  const responseData = anyErr.data ?? anyErr.response?.data;

  return (
    responseData?.details ||
    responseData?.error ||
    responseData?.message ||
    anyErr.message ||
    fallbackMessage
  );
};

export async function getAdminMemberUsers() {
  try {
    const response = await pb.send<AdminUsersResponse>("/api/admin/users", {
      method: "GET",
    });

    return response.users;
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to load members."));
  }
}

export async function updateMemberPassword(
  payload: UpdateMemberPasswordPayload,
) {
  try {
    return await pb.send<UpdateMemberPasswordResponse>(
      "/api/admin/users/password",
      {
        method: "POST",
        body: payload,
      },
    );
  } catch (err) {
    throw new Error(getErrorMessage(err, "Failed to update password."));
  }
}
