import { createContext, useContext } from 'react';
import { type Dispatch, useState } from 'react';
import { getQuickGuid } from '../../utils/uuid';

export type HomePageContextModel = {
    isShowMnemoschema: boolean;
    setIsShowMnemoschema: Dispatch<React.SetStateAction<boolean>>;
    updateSharedRegulatorStateRefreshToken: string,
    setUpdateSharedRegulatorStateRefreshToken: Dispatch<React.SetStateAction<string>>;
};

export const HomePageContext = createContext({} as HomePageContextModel);

export function HomePageContextProvider(props: any) {

    const [isShowMnemoschema, setIsShowMnemoschema] = useState<boolean>(true);
    const [updateSharedRegulatorStateRefreshToken, setUpdateSharedRegulatorStateRefreshToken] = useState<string>(getQuickGuid());

    return (
        <HomePageContext.Provider value={{
            isShowMnemoschema,
            setIsShowMnemoschema,
            updateSharedRegulatorStateRefreshToken,
            setUpdateSharedRegulatorStateRefreshToken
        }} {...props} />
    );
}

export const useHomePage = () => useContext(HomePageContext);