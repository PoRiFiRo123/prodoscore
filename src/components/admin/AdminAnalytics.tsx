import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A28DFF', '#FF6666', '#66B2FF'];

export const AdminAnalytics = () => {
  // Fetch Team Performance Data
  const { data: teamPerformanceData, isLoading: isLoadingTeamPerformance } = useQuery({
    queryKey: ["teamPerformance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("name, total_score")
        .order("total_score", { ascending: false });
      if (error) throw error;
      return data.map(team => ({ name: team.name, score: team.total_score || 0 }));
    },
  });

  // Fetch Judge Activity Data
  const { data: judgeActivityData, isLoading: isLoadingJudgeActivity } = useQuery({
    queryKey: ["judgeActivity"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scores")
        .select("judge_id, count")
        .rollup("count")
        .neq("judge_id", null);

      if (error) throw error;

      const judgeIds = data.map(item => item.judge_id);
      const { data: judges, error: judgeError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", judgeIds);
      if (judgeError) throw judgeError;

      const judgeMap = new Map(judges.map(judge => [judge.id, judge.full_name || `Judge ${judge.id.substring(0, 4)}`]));

      return data.map(item => ({
        name: judgeMap.get(item.judge_id) || `Unknown Judge ${item.judge_id.substring(0, 4)}`,
        evaluations: item.count,
      }));
    },
  });

  // Fetch Event Engagement Data (e.g., Active vs. Inactive Users based on roles)
  const { data: eventEngagementData, isLoading: isLoadingEventEngagement } = useQuery({
    queryKey: ["eventEngagement"],
    queryFn: async () => {
      const { data: userRoles, error: userRolesError } = await supabase
        .from("user_roles")
        .select("user_id");
      if (userRolesError) throw userRolesError;

      const activeUserIds = new Set(userRoles.map(role => role.user_id));

      const { data: allUsers, error: allUsersError } = await supabase
        .from("profiles")
        .select("id");
      if (allUsersError) throw allUsersError;

      const totalUsers = allUsers.length;
      const activeUsers = activeUserIds.size;
      const inactiveUsers = totalUsers - activeUsers;

      return [
        { name: 'Users with Roles', value: activeUsers },
        { name: 'Users without Roles', value: inactiveUsers },
      ];
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingTeamPerformance ? (
            <div>Loading team performance...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={teamPerformanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Judge Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingJudgeActivity ? (
            <div>Loading judge activity...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={judgeActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="evaluations" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>User Engagement</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEventEngagement ? (
            <div>Loading user engagement...</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventEngagementData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label
                >
                  {eventEngagementData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
