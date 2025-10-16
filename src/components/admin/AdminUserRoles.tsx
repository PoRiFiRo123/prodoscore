import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export const AdminUserRoles = () => {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState({});

  const { data: users, isLoading } = useQuery({
    queryKey: ["users_with_roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, user_roles(role)");
      if (error) throw error;
      return data.map(user => ({
        ...user,
        role: user.user_roles.length > 0 ? user.user_roles[0].role : "",
      }));
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }) => {
      const { error: deleteError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteError) throw deleteError;

      if (newRole) {
        const { error: insertError } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: newRole });
        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["users_with_roles"]);
      toast.success("User role updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update user role: " + error.message);
    },
  });

  const handleRoleChange = (userId, newRole) => {
    setSelectedRole(prev => ({ ...prev, [userId]: newRole }));
    updateUserRoleMutation.mutate({ userId, newRole });
  };

  if (isLoading) return <div>Loading users...</div>;

  return (
    <div className="container mx-auto py-10">
      <h2 className="text-2xl font-bold mb-4">User Role Management</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.full_name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{selectedRole[user.id] || user.role || "No Role"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Change Role
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleRoleChange(user.id, "admin")}>Admin</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleRoleChange(user.id, "judge")}>Judge</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleRoleChange(user.id, null)}>Remove Role</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
