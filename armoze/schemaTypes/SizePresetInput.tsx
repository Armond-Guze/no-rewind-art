import type {StringInputProps} from 'sanity'

const sizePresetPreview: Record<
  string,
  {label: string; note: string; sizes: Array<{label: string; price: string; badge?: string}>}
> = {
  landscapeWide: {
    label: 'Landscape 2:1',
    note: 'Best for wide horizontal artwork.',
    sizes: [
      {label: '20 x 10', price: '$89.99'},
      {label: '30 x 15', price: '$129.99'},
      {label: '40 x 20', price: '$189.99'},
      {label: '48 x 24', price: '$219.99', badge: 'Best Value'},
      {label: '60 x 30', price: '$449.99', badge: 'Museum'},
    ],
  },
  portraitTwoThree: {
    label: 'Portrait 2:3',
    note: 'Best for vertical artwork.',
    sizes: [
      {label: '12 x 18', price: '$89.99'},
      {label: '16 x 24', price: '$109.99'},
      {label: '24 x 36', price: '$159.99', badge: 'Best Value'},
      {label: '32 x 48', price: '$299.99'},
      {label: '40 x 60', price: '$499.99', badge: 'Statement'},
    ],
  },
  portraitThreeFour: {
    label: 'Portrait 3:4',
    note: 'Best for wider vertical object artwork.',
    sizes: [
      {label: '12 x 16', price: '$65'},
      {label: '18 x 24', price: '$95'},
      {label: '24 x 32', price: '$125', badge: 'Best Value'},
      {label: '36 x 48', price: '$195'},
      {label: '45 x 60', price: '$225', badge: 'Statement'},
    ],
  },
  landscapeThreeTwo: {
    label: 'Landscape 3:2',
    note: 'Best for standard horizontal artwork.',
    sizes: [
      {label: '18 x 12', price: '$89.99'},
      {label: '24 x 16', price: '$109.99'},
      {label: '36 x 24', price: '$159.99', badge: 'Best Value'},
      {label: '48 x 32', price: '$299.99', badge: 'Popular'},
      {label: '60 x 40', price: '$499.99', badge: 'Statement'},
    ],
  },
  landscapeFourThree: {
    label: 'Landscape 4:3',
    note: 'For 16 x 12, 24 x 18, and similar artwork.',
    sizes: [
      {label: '16 x 12', price: '$65'},
      {label: '24 x 18', price: '$95'},
      {label: '32 x 24', price: '$125', badge: 'Best Value'},
      {label: '48 x 36', price: '$195'},
      {label: '60 x 45', price: '$225', badge: 'Statement'},
    ],
  },
  squareStandard: {
    label: 'Square',
    note: 'For square artwork.',
    sizes: [
      {label: '12 x 12', price: '$45'},
      {label: '16 x 16', price: '$65'},
      {label: '24 x 24', price: '$99', badge: 'Best Value'},
      {label: '30 x 30', price: '$129', badge: 'Popular'},
    ],
  },
}

export function SizePresetInput(props: StringInputProps) {
  const selectedPreset = props.value ? sizePresetPreview[props.value] : null

  return (
    <div>
      {props.renderDefault(props)}
      <div
        style={{
          border: '1px solid var(--card-border-color)',
          borderRadius: 6,
          marginTop: 12,
          padding: 12,
        }}
      >
        {selectedPreset ? (
          <>
            <div style={{fontSize: 13, fontWeight: 700}}>{selectedPreset.label}</div>
            <div style={{color: 'var(--card-muted-fg-color)', fontSize: 12, marginTop: 2}}>
              {selectedPreset.note}
            </div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10}}>
              {selectedPreset.sizes.map((size) => (
                <div
                  key={size.label}
                  style={{
                    border: '1px solid var(--card-border-color)',
                    borderRadius: 4,
                    padding: '7px 9px',
                  }}
                >
                  <div style={{fontSize: 12, fontWeight: 700}}>{size.label}</div>
                  <div style={{color: 'var(--card-muted-fg-color)', fontSize: 12}}>{size.price}</div>
                  {size.badge ? (
                    <div style={{fontSize: 10, fontWeight: 700, marginTop: 3, textTransform: 'uppercase'}}>
                      {size.badge}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{color: 'var(--card-muted-fg-color)', fontSize: 12}}>
            Pick a preset like 2:1, 2:3, or 3:2 and the storefront will use its shared sizes.
          </div>
        )}
      </div>
    </div>
  )
}
