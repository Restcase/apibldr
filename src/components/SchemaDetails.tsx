import { isObject, type JsonObject } from '../domain/document';
import {
  TextField,
  Choice,
  Flag,
  SchemaChoice,
  Properties,
} from './ComponentFields';
import JsonField from './JsonField';
export default function SchemaDetails({
  value,
  schemas,
  patch,
  depth = 0,
}: {
  value: JsonObject;
  schemas: string[];
  patch: (value: JsonObject) => void;
  depth?: number;
}) {
  return (
    <details className="advanced-details">
      <summary>Schema details & constraints</summary>
      <div className="advanced-fields">
        <TextField
          label="Schema title"
          value={value.title}
          onChange={(title) => patch({ title })}
        />
        <Choice
          label="Format"
          value={value.format}
          choices={[
            'date',
            'date-time',
            'email',
            'uuid',
            'uri',
            'hostname',
            'ipv4',
            'ipv6',
            'int32',
            'int64',
            'float',
            'double',
            'byte',
            'binary',
            'password',
          ]}
          onChange={(format) => patch({ format: format || undefined })}
        />
        <TextField
          label="Pattern"
          value={value.pattern}
          onChange={(pattern) => patch({ pattern: pattern || undefined })}
        />
        <div className="operation-fields">
          {[
            'minimum',
            'maximum',
            'multipleOf',
            'minLength',
            'maxLength',
            'minItems',
            'maxItems',
            'minProperties',
            'maxProperties',
          ].map((key) => (
            <label key={key}>
              {key}
              <input
                type="number"
                value={typeof value[key] === 'number' ? String(value[key]) : ''}
                onChange={(e) =>
                  patch({
                    [key]:
                      e.target.value === ''
                        ? undefined
                        : e.target.valueAsNumber,
                  })
                }
              />
            </label>
          ))}
        </div>
        {['readOnly', 'writeOnly', 'deprecated', 'uniqueItems'].map((key) => (
          <Flag
            key={key}
            label={key}
            checked={value[key] === true}
            onChange={(v) => patch({ [key]: v })}
          />
        ))}
        {value.type === 'array' && depth < 8 && (
          <details className="advanced-details">
            <summary>Array item schema</summary>
            <div className="advanced-fields">
              <SchemaChoice
                schema={value.items}
                schemas={schemas}
                onChange={(items) => patch({ items })}
              />
              {isObject(value.items) && (
                <>
                  <TextField
                    label="Item description"
                    value={value.items.description}
                    onChange={(description) =>
                      patch({
                        items: { ...(value.items as JsonObject), description },
                      })
                    }
                  />
                  {value.items.type === 'object' && (
                    <Properties
                      value={value.items}
                      schemas={schemas}
                      patch={(fields) =>
                        patch({
                          items: { ...(value.items as JsonObject), ...fields },
                        })
                      }
                      depth={depth + 1}
                    />
                  )}
                  <SchemaDetails
                    value={value.items}
                    schemas={schemas}
                    patch={(fields) =>
                      patch({
                        items: { ...(value.items as JsonObject), ...fields },
                      })
                    }
                    depth={depth + 1}
                  />
                </>
              )}
            </div>
          </details>
        )}
        {['enum', 'examples', 'allOf', 'anyOf', 'oneOf'].map((key) => (
          <JsonField
            key={key}
            label={key}
            kind="array"
            value={value[key]}
            onChange={(v) => patch({ [key]: v })}
          />
        ))}
        {['default', 'const', 'additionalProperties'].map((key) => (
          <JsonField
            key={key}
            label={key}
            kind="any"
            value={value[key]}
            onChange={(v) => patch({ [key]: v })}
          />
        ))}
        {[
          'patternProperties',
          'propertyNames',
          'not',
          'discriminator',
          'xml',
          'externalDocs',
        ].map((key) => (
          <JsonField
            key={key}
            label={key}
            value={value[key]}
            onChange={(v) => patch({ [key]: v })}
          />
        ))}
      </div>
    </details>
  );
}
