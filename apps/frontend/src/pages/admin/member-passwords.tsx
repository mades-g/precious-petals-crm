import { useMemo, useState } from "react";
import { EyeClosedIcon, EyeOpenIcon, LockClosedIcon } from "@radix-ui/react-icons";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Heading,
  IconButton,
  Select,
  Text,
  TextField,
} from "@radix-ui/themes";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getAdminMemberUsers,
  updateMemberPassword,
  type AdminMemberUser,
} from "@/api/admin-users";

const MIN_PASSWORD_LENGTH = 8;

export default function MemberPasswords() {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const {
    data: users = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin-member-users"],
    queryFn: getAdminMemberUsers,
  });

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId),
    [users, selectedUserId],
  );

  const mutation = useMutation({
    mutationFn: updateMemberPassword,
    onSuccess: (_response, variables) => {
      const user = users.find((item) => item.id === variables.userId);
      const label = user ? getUserLabel(user) : "Member";
      setSuccessMessage(`${label} password updated.`);
      setPassword("");
      setPasswordConfirm("");
    },
  });

  const validationError = getValidationError({
    selectedUserId,
    password,
    passwordConfirm,
  });
  const submitDisabled = mutation.isPending || !!validationError;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccessMessage("");

    if (validationError) {
      return;
    }

    await mutation.mutateAsync({
      userId: selectedUserId,
      password,
      passwordConfirm,
    });
  };

  return (
    <Box width="100%">
      <Card>
        <form onSubmit={handleSubmit}>
          <Flex direction="column" gap="4">
            <Flex justify="between" align="start" gap="4" wrap="wrap">
              <Box>
                <Heading size="5">Member passwords</Heading>
                <Text as="p" size="2" color="gray" mt="1">
                  Update passwords for non-admin team members.
                </Text>
              </Box>
              <Badge color="red" variant="soft">
                Admin only
              </Badge>
            </Flex>

            {isLoading && (
              <Text size="2" color="gray">
                Loading members...
              </Text>
            )}

            {isError && (
              <Text size="2" color="red">
                {(error as Error)?.message ?? "Failed to load members."}
              </Text>
            )}

            {!isLoading && !isError && users.length === 0 && (
              <Text size="2" color="gray">
                No member accounts found.
              </Text>
            )}

            {!isLoading && !isError && users.length > 0 && (
              <>
                <Box maxWidth="460px">
                  <Text as="label" size="2" weight="medium">
                    Member
                  </Text>
                  <Select.Root
                    value={selectedUserId}
                    onValueChange={(value) => {
                      setSelectedUserId(value);
                      setSuccessMessage("");
                      mutation.reset();
                    }}
                  >
                    <Select.Trigger placeholder="Choose a member" />
                    <Select.Content>
                      {users.map((user) => (
                        <Select.Item key={user.id} value={user.id}>
                          {getUserLabel(user)}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Box>

                {selectedUser && (
                  <Flex direction="column" gap="1">
                    <Text size="2">
                      <strong>Email:</strong> {selectedUser.email}
                    </Text>
                    <Text size="2">
                      <strong>Role:</strong> {selectedUser.role}
                    </Text>
                  </Flex>
                )}

                <Flex direction="column" gap="3" maxWidth="460px">
                  <Box>
                    <Text
                      as="label"
                      size="2"
                      htmlFor="new-password"
                      weight="medium"
                    >
                      New password
                    </Text>
                    <TextField.Root
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      placeholder="Enter a new password"
                      autoComplete="new-password"
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setSuccessMessage("");
                        mutation.reset();
                      }}
                    >
                      <TextField.Slot>
                        <LockClosedIcon height="16" width="16" />
                      </TextField.Slot>
                      <TextField.Slot pr="3">
                        <IconButton
                          size="2"
                          variant="ghost"
                          type="button"
                          onClick={() => setShowPassword((current) => !current)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeClosedIcon height="16" width="16" />
                          ) : (
                            <EyeOpenIcon height="16" width="16" />
                          )}
                        </IconButton>
                      </TextField.Slot>
                    </TextField.Root>
                  </Box>

                  <Box>
                    <Text
                      as="label"
                      size="2"
                      htmlFor="confirm-password"
                      weight="medium"
                    >
                      Confirm password
                    </Text>
                    <TextField.Root
                      id="confirm-password"
                      type={showPassword ? "text" : "password"}
                      value={passwordConfirm}
                      placeholder="Confirm the new password"
                      autoComplete="new-password"
                      onChange={(event) => {
                        setPasswordConfirm(event.target.value);
                        setSuccessMessage("");
                        mutation.reset();
                      }}
                    />
                  </Box>
                </Flex>

                {validationError && (
                  <Text size="2" color="gray">
                    {validationError}
                  </Text>
                )}

                {mutation.isError && (
                  <Text size="2" color="red">
                    {(mutation.error as Error)?.message ??
                      "Failed to update password."}
                  </Text>
                )}

                {successMessage && (
                  <Text size="2" color="green">
                    {successMessage}
                  </Text>
                )}

                <Flex justify="end" maxWidth="460px">
                  <Button
                    type="submit"
                    loading={mutation.isPending}
                    disabled={submitDisabled}
                  >
                    Update password
                  </Button>
                </Flex>
              </>
            )}
          </Flex>
        </form>
      </Card>
    </Box>
  );
}

function getUserLabel(user: AdminMemberUser) {
  return user.name ? `${user.name} (${user.email})` : user.email;
}

function getValidationError({
  selectedUserId,
  password,
  passwordConfirm,
}: {
  selectedUserId: string;
  password: string;
  passwordConfirm: string;
}) {
  if (!selectedUserId) {
    return "Choose a member before updating a password.";
  }
  if (!password || !passwordConfirm) {
    return "Enter and confirm the new password.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password !== passwordConfirm) {
    return "Passwords do not match.";
  }
  return "";
}
