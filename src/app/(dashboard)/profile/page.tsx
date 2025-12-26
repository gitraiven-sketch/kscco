'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/firebase";

export default function ProfilePage() {
    const { user } = useUser();

    return (
        <div className="space-y-6">
             <div>
                <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
                <p className="text-muted-foreground">
                    View and manage your profile details.
                </p>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>My Profile</CardTitle>
                    <CardDescription>This is your user information.</CardDescription>
                </CardHeader>
                <CardContent>
                   {user ? (
                     <div className="space-y-2">
                        <p><strong>Name:</strong> {user.displayName || 'Not set'}</p>
                        <p><strong>Email:</strong> {user.email}</p>
                     </div>
                   ) : (
                    <p>Loading user information...</p>
                   )}
                </CardContent>
            </Card>
        </div>
    );
}
