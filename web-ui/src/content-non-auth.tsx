import { Route, Routes, Navigate } from 'react-router-dom';
import { SingleCard } from './layouts';
import { SigninForm } from './components';

const ContentNonAuth = () => {
    return (
        <Routes>
            <Route path="/sign-in" element={
                <SingleCard title="Вход">
                    <SigninForm />
                </SingleCard>
            } />

            <Route path='*' element={ <Navigate to='/sign-in' replace /> }
            />
        </Routes>
    );
}

export default ContentNonAuth;
