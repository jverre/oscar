import { AuthGuard } from "@/components/auth/AuthGuard";

export default function OrgTeamLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard allowPublicFiles={true}>{children}</AuthGuard>;
}