import ConvexClientProvider from "../ConvexProviderWithAuth";
import { auth, signOut } from "../../auth";
import { ReactNode } from "react";

export default async function LoggedInLayout({
	children,
}: {
	children: ReactNode;
}) {
	const session = await auth();
	return (
		<>
			<SignOut />
			<ConvexClientProvider session={session}>{children}</ConvexClientProvider>
		</>
	);
}

function SignOut() {
	return (
		<form action={async () => {
			"use server";
			await signOut();
		}}>
			<button type="submit">Sign out</button>
		</form>
	);
}