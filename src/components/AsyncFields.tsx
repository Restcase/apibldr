import BindingFields from './BindingFields';
import {
  isObject,
  type ApiDocument,
  type JsonObject,
} from '../domain/document';
import { type ComponentCategory, getComponents } from '../domain/components';
import ComponentFields, {
  TextField,
  Choice,
  SchemaChoice,
  Properties,
  OAuthFields,
} from './ComponentFields';
import JsonField from './JsonField';
export default function AsyncFields({
  category,
  value,
  patch,
  document,
  replace,
}: {
  category: ComponentCategory;
  value: JsonObject;
  patch: (value: JsonObject) => void;
  document: ApiDocument;
  replace?: (value: JsonObject) => void;
}) {
  const schemas = Object.keys(getComponents(document, 'schemas'));
  if (value.$ref)
    return (
      <TextField
        label="Reference"
        value={value.$ref}
        onChange={($ref) => patch({ $ref })}
      />
    );
  if (category === 'schemas')
    return (
      <>
        <ComponentFields
          category={category}
          value={value}
          patch={patch}
          schemas={schemas}
        />
        <JsonField
          label="Schema constraints and composition"
          value={value}
          onChange={(v) => patch(v as JsonObject)}
          hint="Configure constraints, nested schemas, examples, allOf, anyOf or oneOf."
        />
      </>
    );
  if (category === 'securitySchemes')
    return (
      <>
        <Choice
          label="Authentication type"
          value={value.type}
          choices={[
            'userPassword',
            'apiKey',
            'X509',
            'symmetricEncryption',
            'asymmetricEncryption',
            'httpApiKey',
            'http',
            'oauth2',
            'openIdConnect',
            'plain',
            'scramSha256',
            'scramSha512',
            'gssapi',
          ]}
          onChange={(type) => patch({ type })}
        />
        {value.type === 'apiKey' ? (
          <Choice
            label="Credential location"
            value={value.in}
            choices={['user', 'password']}
            onChange={(location) => patch({ in: location })}
          />
        ) : value.type === 'httpApiKey' ? (
          <>
            <TextField
              label="API key name"
              value={value.name}
              onChange={(name) => patch({ name })}
            />
            <Choice
              label="API key location"
              value={value.in}
              choices={['header', 'query', 'cookie']}
              onChange={(location) => patch({ in: location })}
            />
          </>
        ) : value.type === 'oauth2' ? (
          <OAuthFields
            value={value}
            patch={patch}
            scopeKey={
              document.asyncapi?.startsWith('3.') ? 'availableScopes' : 'scopes'
            }
          />
        ) : value.type === 'http' ? (
          <>
            <Choice
              label="HTTP scheme"
              value={value.scheme}
              choices={['basic', 'bearer', 'digest']}
              onChange={(scheme) => patch({ scheme })}
            />
            {value.scheme === 'bearer' && (
              <TextField
                label="Bearer format"
                value={value.bearerFormat}
                onChange={(bearerFormat) => patch({ bearerFormat })}
              />
            )}
          </>
        ) : value.type === 'openIdConnect' ? (
          <TextField
            label="OpenID discovery URL"
            value={value.openIdConnectUrl}
            onChange={(openIdConnectUrl) => patch({ openIdConnectUrl })}
          />
        ) : (
          <TextField
            label="Description"
            value={value.description}
            multiline
            onChange={(description) => patch({ description })}
          />
        )}
      </>
    );
  if (category.endsWith('Bindings'))
    return (
      <BindingFields
        scope={category.replace('Bindings', '')}
        value={value}
        onChange={replace ?? patch}
      />
    );
  const isMessage = category === 'messages' || category === 'messageTraits';
  return (
    <div className="component-fields">
      <TextField
        label="Description"
        value={value.description}
        multiline
        onChange={(description) => patch({ description })}
      />
      {category === 'correlationIds' && (
        <TextField
          label="Correlation location"
          value={value.location}
          onChange={(location) => patch({ location })}
          hint="For example, $message.header#/correlationId or $message.payload#/id."
        />
      )}
      {category === 'parameters' && (
        <>
          {!document.asyncapi?.startsWith('3.') && (
            <SchemaChoice
              schema={value.schema}
              schemas={schemas}
              onChange={(schema) => patch({ schema })}
            />
          )}
          <TextField
            label="Parameter location (optional)"
            value={value.location}
            onChange={(location) => patch({ location })}
          />
          <JsonField
            label="Parameter options"
            value={value}
            onChange={(v) => patch(v as JsonObject)}
          />
        </>
      )}
      {(isMessage || category === 'operationTraits') && (
        <>
          {category === 'operationTraits' &&
            !document.asyncapi?.startsWith('3.') && (
              <TextField
                label="Operation ID"
                value={value.operationId}
                onChange={(operationId) => patch({ operationId })}
              />
            )}
          <JsonField
            label="External documentation"
            value={value.externalDocs}
            onChange={(externalDocs) => patch({ externalDocs })}
          />
          <TextField
            label="Summary"
            value={value.summary}
            onChange={(summary) => patch({ summary })}
          />
          <JsonField
            label="Tags"
            value={value.tags}
            kind="array"
            onChange={(tags) => patch({ tags })}
          />
          <details className="advanced-details">
            <summary>Bindings</summary>
            <BindingFields
              scope={isMessage ? 'message' : 'operation'}
              value={isObject(value.bindings) ? value.bindings : {}}
              onChange={(bindings) => patch({ bindings })}
            />
          </details>
        </>
      )}
      {isMessage && (
        <>
          <TextField
            label="Message name"
            value={value.name}
            onChange={(name) => patch({ name })}
          />
          <TextField
            label="Message title"
            value={value.title}
            onChange={(title) => patch({ title })}
          />
          <Choice
            label="Content type"
            value={value.contentType}
            choices={[
              'application/json',
              'application/avro',
              'application/octet-stream',
              'text/plain',
            ]}
            onChange={(contentType) => patch({ contentType })}
          />
          {category === 'messages' && (
            <section className="component-subsection">
              <h3>Payload</h3>
              <SchemaChoice
                label="Payload type"
                schema={value.payload}
                schemas={schemas}
                onChange={(payload) => patch({ payload })}
              />
              {isObject(value.payload) && value.payload.type === 'object' && (
                <Properties
                  value={value.payload}
                  schemas={schemas}
                  patch={(fields) =>
                    patch({
                      payload: { ...(value.payload as JsonObject), ...fields },
                    })
                  }
                />
              )}
              <JsonField
                label="Complete payload schema"
                value={value.payload}
                kind="any"
                onChange={(payload) => patch({ payload })}
              />
              {!document.asyncapi?.startsWith('3.') && (
                <TextField
                  label="Schema format (optional)"
                  value={value.schemaFormat}
                  onChange={(schemaFormat) => patch({ schemaFormat })}
                />
              )}
            </section>
          )}
          <JsonField
            label="Headers schema"
            value={value.headers}
            onChange={(headers) => patch({ headers })}
          />
          <JsonField
            label="Correlation ID"
            value={value.correlationId}
            onChange={(correlationId) => patch({ correlationId })}
          />
          <JsonField
            label="Message examples"
            kind="array"
            value={value.examples}
            onChange={(examples) => patch({ examples })}
          />
          {category === 'messages' && (
            <JsonField
              label="Message traits"
              kind="array"
              value={value.traits}
              onChange={(traits) => patch({ traits })}
            />
          )}
        </>
      )}
    </div>
  );
}
