import {
  isObject,
  text,
  type ApiDocument,
  type JsonObject,
} from '../domain/document';
import { getComponents, componentRef } from '../domain/components';
import ComponentFields, { TextField, Choice, Flag } from './ComponentFields';
import JsonField from './JsonField';
import { SecurityRequirements } from './GeneralSettings';
export default function OperationExtras({
  value,
  document,
  patch,
}: {
  value: JsonObject;
  document: ApiDocument;
  patch: (fields: JsonObject) => void;
}) {
  const schemas = Object.keys(getComponents(document, 'schemas'));
  const parameters = Array.isArray(value.parameters) ? value.parameters : [];
  const responses = isObject(value.responses) ? value.responses : {};
  return (
    <div className="form-section">
      <h2>Request & schemas</h2>
      <p className="muted">
        Describe request data and reusable definitions without leaving the
        designer.
      </p>
      <details className="advanced-details">
        <summary>
          Parameters <span>{parameters.length}</span>
        </summary>
        <div className="advanced-fields">
          <div className="quick-add-options">
            {['query', 'header', 'cookie', 'path'].map((location) => (
              <button
                key={location}
                onClick={() =>
                  patch({
                    parameters: [
                      ...parameters,
                      {
                        name: location === 'path' ? 'id' : 'parameter',
                        in: location,
                        required: location === 'path',
                        schema: { type: 'string' },
                      },
                    ],
                  })
                }
              >
                Add {location} parameter
              </button>
            ))}
          </div>
          <Choice
            label="Add reusable parameter"
            value=""
            choices={Object.keys(getComponents(document, 'parameters'))}
            onChange={(key) => {
              if (key)
                patch({
                  parameters: [
                    ...parameters,
                    { $ref: componentRef('parameters', key) },
                  ],
                });
            }}
          />
          {parameters.map((raw, i) => {
            const parameter = isObject(raw) ? raw : {};
            return (
              <details className="advanced-details" key={i} open>
                <summary>
                  {text(parameter.name) ||
                    text(parameter.$ref) ||
                    `Parameter ${i + 1}`}
                </summary>
                <div className="advanced-fields">
                  <ComponentFields
                    category="parameters"
                    value={parameter}
                    schemas={schemas}
                    patch={(fields) =>
                      patch({
                        parameters: parameters.map((v, j) =>
                          j === i ? { ...parameter, ...fields } : v,
                        ),
                      })
                    }
                  />
                  <JsonField
                    label={`Parameter ${i + 1} settings`}
                    value={parameter}
                    onChange={(v) =>
                      patch({
                        parameters: parameters.map((item, j) =>
                          j === i ? v : item,
                        ),
                      })
                    }
                  />
                  <button
                    onClick={() =>
                      patch({
                        parameters: parameters.filter((_, j) => j !== i),
                      })
                    }
                  >
                    Remove parameter {i + 1}
                  </button>
                </div>
              </details>
            );
          })}
        </div>
      </details>
      <details className="advanced-details">
        <summary>Request body</summary>
        <div className="advanced-fields">
          <Choice
            label="Request body definition"
            value={
              isObject(value.requestBody) && value.requestBody.$ref
                ? text(value.requestBody.$ref)
                : value.requestBody
                  ? 'Inline body'
                  : 'No body'
            }
            choices={[
              'No body',
              'Inline body',
              ...Object.keys(getComponents(document, 'requestBodies')).map(
                (name) => componentRef('requestBodies', name),
              ),
            ]}
            onChange={(selection) => {
              if (selection)
                patch({
                  requestBody:
                    selection === 'No body'
                      ? undefined
                      : selection === 'Inline body'
                        ? {
                            content: {
                              'application/json': {
                                schema: { type: 'object' },
                              },
                            },
                          }
                        : { $ref: selection },
                });
            }}
          />
          {isObject(value.requestBody) && (
            <>
              <ComponentFields
                category="requestBodies"
                value={value.requestBody}
                schemas={schemas}
                patch={(fields) =>
                  patch({
                    requestBody: {
                      ...(value.requestBody as JsonObject),
                      ...fields,
                    },
                  })
                }
              />
              <JsonField
                label="Request body settings"
                value={value.requestBody}
                onChange={(requestBody) => patch({ requestBody })}
              />
            </>
          )}
        </div>
      </details>
      <details className="advanced-details">
        <summary>Response content, headers & links</summary>
        <div className="advanced-fields">
          {Object.entries(responses)
            .filter(([code]) => !code.startsWith('x-'))
            .map(([code, raw]) => {
              const response = isObject(raw) ? raw : {};
              const update = (fields: JsonObject) =>
                patch({
                  responses: {
                    ...responses,
                    [code]: { ...response, ...fields },
                  },
                });
              return (
                <details className="advanced-details" key={code}>
                  <summary>Response {code}</summary>
                  <div className="advanced-fields">
                    <Choice
                      label={`Response ${code} definition`}
                      value={text(response.$ref) || 'Inline response'}
                      choices={[
                        'Inline response',
                        ...Object.keys(
                          getComponents(document, 'responses'),
                        ).map((name) => componentRef('responses', name)),
                      ]}
                      onChange={(selection) => {
                        if (selection)
                          patch({
                            responses: {
                              ...responses,
                              [code]:
                                selection === 'Inline response'
                                  ? { description: 'Response' }
                                  : { $ref: selection },
                            },
                          });
                      }}
                    />
                    <ComponentFields
                      category="responses"
                      value={response}
                      schemas={schemas}
                      patch={update}
                    />
                    <JsonField
                      label={`Response ${code} headers`}
                      value={response.headers}
                      onChange={(headers) => update({ headers })}
                    />
                    <JsonField
                      label={`Response ${code} links`}
                      value={response.links}
                      onChange={(links) => update({ links })}
                    />
                    <JsonField
                      label={`Complete response ${code}`}
                      value={response}
                      onChange={(v) =>
                        patch({ responses: { ...responses, [code]: v } })
                      }
                    />
                  </div>
                </details>
              );
            })}
        </div>
      </details>
      <details className="advanced-details">
        <summary>Tags, security & advanced settings</summary>
        <div className="advanced-fields">
          <TextField
            label="Operation tags"
            value={Array.isArray(value.tags) ? value.tags.join(', ') : ''}
            onChange={(tags) =>
              patch({
                tags: tags
                  .split(',')
                  .map((v) => v.trim())
                  .filter(Boolean),
              })
            }
            hint="Comma-separated tag names."
          />
          <Flag
            label="Deprecated operation"
            checked={value.deprecated === true}
            onChange={(deprecated) => patch({ deprecated })}
          />
          <SecurityRequirements
            document={document}
            value={value.security}
            onChange={(security) => patch({ security })}
          />
          <JsonField
            label="Operation servers"
            kind="array"
            value={value.servers}
            onChange={(servers) => patch({ servers })}
          />
          <JsonField
            label="Operation documentation"
            value={value.externalDocs}
            onChange={(externalDocs) => patch({ externalDocs })}
          />
          <JsonField
            label="Callbacks"
            value={value.callbacks}
            onChange={(callbacks) => patch({ callbacks })}
          />
        </div>
      </details>
    </div>
  );
}
