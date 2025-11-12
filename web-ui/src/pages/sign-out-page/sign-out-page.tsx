import {  Route, Routes } from 'react-router-dom';
import { useAuth } from '../../contexts/auth';
import { useEffect } from 'react';


export const SignOutPage = function () {
    const { signOut } = useAuth();

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
