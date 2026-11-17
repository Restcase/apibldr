import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import AsyncChannels from '../src/components/AsyncChannels';
import GeneralSettings from '../src/components/GeneralSettings';
import ComponentWorkspace from '../src/components/ComponentWorkspace';
import { emptyDocument, type ApiDocument } from '../src/domain/document';
import { validateSpecification } from '../src/domain/validation';
function Harness({
  initial,
  section = 'channels',
}: {
  initial: ApiDocument;
  section?: string;
}) {
  const [doc, setDoc] = useState(initial);
  return (
    <>
      {section === 'channels' ? (
        <AsyncChannels document={doc} onChange={setDoc} />
      ) : section === 'bindings' ? (
        <ComponentWorkspace
          category="operationBindings"
          document={doc}
          onChange={setDoc}
        />
      ) : (
        <GeneralSettings section="servers" document={doc} onChange={setDoc} />
      )}
      <output data-testid="saved">{JSON.stringify(doc)}</output>
    </>
  );
}
const saved = () => JSON.parse(screen.getByTestId('saved').textContent!);
describe('AsyncAPI designer', () => {
  it('creates a channel and operation, selects a reusable message and blocks deleting the used channel', async () => {
    const doc = emptyDocument('asyncapi:2.6.0');
    doc.components = {
      messages: {
        OrderCreated: {
          payload: { type: 'object', properties: { id: { type: 'string' } } },
        },
      },
    };
    render(<Harness initial={doc} />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('New channel'), 'orders.created');
    await user.click(screen.getByRole('button', { name: 'Add channel' }));
    await user.click(screen.getByRole('button', { name: 'Add publish' }));
    await user.selectOptions(
      screen.getByLabelText('publish message'),
      '#/components/messages/OrderCreated',
    );
    expect(saved().channels['orders.created'].publish.message).toEqual({
      $ref: '#/components/messages/OrderCreated',
    });
    expect(await validateSpecification(saved())).toEqual([]);
    await user.click(screen.getByRole('button', { name: 'Remove channel' }));
    expect(screen.getByRole('alert')).toHaveTextContent('operations first');
    await user.click(screen.getByRole('button', { name: 'Remove operation' }));
    await user.click(screen.getByRole('button', { name: 'Remove channel' }));
    expect(saved().channels).toEqual({});
  });
  it('creates a v3 broker with a security scheme reference', async () => {
    const doc = emptyDocument('asyncapi:3.0.0');
    doc.components = {
      securitySchemes: { BrokerAuth: { type: 'userPassword' } },
    };
    render(<Harness initial={doc} section="servers" />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Server key'), 'production');
    await user.click(screen.getByRole('button', { name: 'Add server' }));
    await user.selectOptions(
      screen.getByLabelText('Security scheme'),
      'BrokerAuth',
    );
    await user.click(
      screen.getByRole('button', { name: 'Add security requirement' }),
    );
    expect(saved().servers.production.security).toEqual([
      { $ref: '#/components/securitySchemes/BrokerAuth' },
    ]);
    expect(await validateSpecification(saved())).toEqual([]);
  });
  it('edits and removes protocol bindings through visual controls', async () => {
    render(
      <Harness initial={emptyDocument('asyncapi:2.6.0')} section="bindings" />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'MQTT' }));
    fireEvent.change(screen.getByLabelText('Quality of service (0, 1 or 2)'), {
      target: { value: '1' },
    });
    await user.click(screen.getByLabelText('Retain message'));
    expect(saved().components.operationBindings.mqttBinding.mqtt).toEqual({
      qos: 1,
      retain: true,
    });
    expect(await validateSpecification(saved())).toEqual([]);
    await user.click(
      screen.getByRole('button', { name: 'Remove mqtt binding' }),
    );
    expect(saved().components.operationBindings.mqttBinding).toEqual({});
  });
});
