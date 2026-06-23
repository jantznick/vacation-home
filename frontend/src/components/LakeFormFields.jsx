import FormField from './FormField';

export default function LakeFormFields({ values, onChange, idPrefix = 'lake' }) {
  const update = (field) => (event) => {
    onChange({ ...values, [field]: event.target.value });
  };

  const inputClass = 'w-full rounded-md border border-pine-300 px-3 py-2 text-sm';
  const fieldId = (name) => (idPrefix ? `${idPrefix}-${name}` : name);

  return (
    <>
      <FormField label="Lake name" htmlFor={fieldId('name')} className="sm:col-span-2">
        <input
          id={fieldId('name')}
          value={values.name}
          onChange={update('name')}
          required
          placeholder="Bass Lake"
          className={inputClass}
        />
      </FormField>

      <FormField label="Acreage" htmlFor={fieldId('acreage')}>
        <input
          id={fieldId('acreage')}
          type="number"
          step="0.1"
          value={values.acreage}
          onChange={update('acreage')}
          placeholder="272"
          className={inputClass}
        />
      </FormField>

      <FormField label="Max depth (ft)" htmlFor={fieldId('maxDepthFeet')}>
        <input
          id={fieldId('maxDepthFeet')}
          type="number"
          step="0.1"
          value={values.maxDepthFeet}
          onChange={update('maxDepthFeet')}
          placeholder="15"
          className={inputClass}
        />
      </FormField>

      <FormField label="Avg depth (ft)" htmlFor={fieldId('avgDepthFeet')}>
        <input
          id={fieldId('avgDepthFeet')}
          type="number"
          step="0.1"
          value={values.avgDepthFeet}
          onChange={update('avgDepthFeet')}
          className={inputClass}
        />
      </FormField>

      <FormField label="Water clarity" htmlFor={fieldId('waterClarity')}>
        <input
          id={fieldId('waterClarity')}
          value={values.waterClarity}
          onChange={update('waterClarity')}
          placeholder="moderately clear"
          className={inputClass}
        />
      </FormField>

      <FormField label="Edge / bottom type" htmlFor={fieldId('edgeType')}>
        <input
          id={fieldId('edgeType')}
          value={values.edgeType}
          onChange={update('edgeType')}
          placeholder="sandy, rocky, marsh..."
          className={inputClass}
        />
      </FormField>

      <FormField label="WI DNR source URL" htmlFor={fieldId('dnrSourceUrl')} className="sm:col-span-2">
        <input
          id={fieldId('dnrSourceUrl')}
          value={values.dnrSourceUrl}
          onChange={update('dnrSourceUrl')}
          placeholder="https://apps.dnr.wi.gov/lakes/lakepages/LakeDetail.aspx?wbic=..."
          className={inputClass}
        />
      </FormField>

      <FormField label="Notes" htmlFor={fieldId('notes')} className="sm:col-span-2">
        <textarea
          id={fieldId('notes')}
          value={values.notes}
          onChange={update('notes')}
          rows={3}
          className={inputClass}
        />
      </FormField>
    </>
  );
}
