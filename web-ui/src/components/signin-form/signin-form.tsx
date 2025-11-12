import './signin-form.scss';
import { useState, useCallback, type FormEvent, useMemo } from 'react';
import Form, { Item, Label, ButtonItem, ButtonOptions, RequiredRule } from 'devextreme-react/form';
import LoadIndicator from 'devextreme-react/load-indicator';
import { useAuth } from '../../contexts/auth';
import { proclaim, proclaimError } from '../../utils/proclaim';
import type { SignInModel } from '../../models/signin-model';

export const SigninForm = () => {
    const [loading, setLoading] = useState<boolean>(false);
    const { signIn } = useAuth();

    const formData = useMemo<SignInModel>( () => {
        return {} as SignInModel
    }, []);

    const onSubmit = useCallback(async (e: FormEvent) => {
        e.preventDefault();
        if (formData) {
            setLoading(true);
            try {
                await signIn(formData);
                proclaim({
                    type: 'success',
                    message: 'Пользователь успешно выполнил вход.' ,
                    // displayTime: 30000000,
                });

            } catch (error) {
                await proclaimError(error);
            }
            setLoading(false);
        }
    }, [formData, signIn]);

    return (
        <form className={ 'signin-form' } onSubmit={ onSubmit }>
            <Form formData={ formData } disabled={ loading }>
                <Item dataField={ 'login' } editorType={ 'dxTextBox' } editorOptions={ { stylingMode: 'filled' } }>
                    <Label visible={ false } />
                </Item>
                <Item dataField={ 'password' } editorType={ 'dxTextBox' } editorOptions={ { stylingMode: 'filled', placeholder: 'Пароль', mode: 'password' } }>
                    <RequiredRule message="Требуется пароль" />
                    <Label visible={ false } />
                </Item>
                <ButtonItem>
                    <ButtonOptions width={ '100%' } type={ 'default' } useSubmitBehavior={ true }>
                        <span className="dx-button-text">
                            {
                                loading
                                    ? <LoadIndicator width={ '24px' } height={ '24px' } visible={ true } />
                                    : 'Вход'
                            }
                        </span>
                    </ButtonOptions>
                </ButtonItem>
            </Form>
        </form>
    );
}
