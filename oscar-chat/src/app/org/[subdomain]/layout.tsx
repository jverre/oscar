import { AuthGuard } from "@/components/auth/AuthGuard";

export default function OrgLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <AuthGuard allowPublicFiles={true}>{children}</AuthGuard>;
}