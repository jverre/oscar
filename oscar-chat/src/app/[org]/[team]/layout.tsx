import { AuthGuard } from "@/components/auth/AuthGuard";

export default function OrgTeamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard>{children}</AuthGuard>;
}