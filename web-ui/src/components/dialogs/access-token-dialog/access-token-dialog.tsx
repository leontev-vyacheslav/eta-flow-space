
import { Form, SimpleItem, Label } from 'devextreme-react/form';
import AppModalPopup from '../app-modal-popup/app-modal-popup';
import { useRef } from 'react';
import Button from 'devextreme-react/button';
import { type AppModalPopupProps } from '../../../models/app-modal-popup-props';

export const AccessTokenDialog = ({ callback }: AppModalPopupProps) => {
  const formData = useRef({ accessToken: null });
  const formRef = useRef<Form>(null);
  const buttonRef = useRef<Button>(null);

  return (
    <AppModalPopup title='Токен доступа'
      callback={ () => {
        callback({ modalResult: 'CANCEL' });
      } } height={ undefined } width={ undefined } >
      <Form ref={ formRef } formData={ formData }>
        <SimpleItem
          editorType='dxTextBox'
          dataField='accessToken'
        >
          <Label text='Токен доступа' />
        </SimpleItem>
        <SimpleItem>
          <div style={ { display: 'flex', justifyContent: 'flex-end' } }>
            <Button ref={ buttonRef } text='Выбрать' type='default' disabled onClick={ () => {
              const formData = formRef.current?.instance.option('formData');
              callback({ modalResult: 'OK', data: formData.accessToken })
            } } />
          </div>
        </SimpleItem>
      </Form>
    </AppModalPopup>
  );
}