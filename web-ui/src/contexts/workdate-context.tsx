import  { createContext, useCallback, useContext, useRef, useState } from 'react';
import WorkDatePicker from '../components/work-date-picker/work-date-picker';
import type { ProcFunc } from '../models/primitive-type';
import DateBox from 'devextreme-react/date-box';

export type WorkdatePickerContextModel = {
    showWorkDatePicker: ProcFunc;
}

const WorkdatePickerContext = createContext<WorkdatePickerContextModel>({} as WorkdatePickerContextModel);
const useWorkdatePicker = () => useContext(WorkdatePickerContext);

function WorkdatePickerProvider (props: any) {
    const { children } = props;
    const [isShowWorkDatePicker, setIsWorkDatePicker] = useState<boolean>(false);
    const workDatePickerRef = useRef<DateBox>(null);


    const showWorkDatePicker = useCallback<ProcFunc>(() => {
        setIsWorkDatePicker(true);
        setTimeout(() => {
            if (workDatePickerRef && workDatePickerRef.current) {
                workDatePickerRef.current.instance.open();
            }
        }, 100)

    }, []);

    const hideWorkDatePicker = useCallback<ProcFunc>(() => {
        setIsWorkDatePicker(false);
    }, []);


    return (
        <WorkdatePickerContext.Provider value={ { showWorkDatePicker  } } { ...props }>
            { isShowWorkDatePicker ? <WorkDatePicker ref={ workDatePickerRef } onClosed={ hideWorkDatePicker }/> : null }
            { children }
        </WorkdatePickerContext.Provider>
    );
}

export { useWorkdatePicker, WorkdatePickerProvider };
