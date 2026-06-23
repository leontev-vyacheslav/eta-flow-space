import {  Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../../contexts/auth-store';


export const SignOutPage = function () {
    const signOut = useAuthStore((s) => s.signOut);

    useEffect(() => {
        (async () => {
            await signOut();
        })();
    }, [signOut]);

    return (
        <Routes>
            <Route  path='/logout'/>
        </Routes>
    );
}
