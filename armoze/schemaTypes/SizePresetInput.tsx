import {useEffect, useState} from 'react'
import {useClient, useFormValue, type StringInputProps} from 'sanity'

type SizeOption = {
  id?: string
  label?: string
  priceInCents?: number
  badge?: string
}

const sizePresetPreview: Record<
  string,
  {label: string; note: string; fallbackSizes: string[]}
> = {
  landscapeWide: {
    label: 'Landscape 2:1',
    note: 'Wide horizontal artwork. The storefront canvas uses a 2:1 ratio.',
    fallbackSizes: ['20 x 10', '30 x 15', '40 x 20', '48 x 24', '60 x 30'],
  },
  portraitTwoThree: {
    label: 'Portrait 2:3',
    note: 'Tall vertical artwork. The storefront canvas uses a 2:3 ratio.',
    fallbackSizes: ['12 x 18', '16 x 24', '24 x 36', '32 x 48', '40 x 60'],
  },
  portraitThreeFour: {
    label: 'Portrait 3:4',
    note: 'Wider vertical artwork. The storefront canvas uses a 3:4 ratio.',
    fallbackSizes: ['12 x 16', '18 x 24', '24 x 32', '36 x 48', '45 x 60'],
  },
  landscapeThreeTwo: {
    label: 'Landscape 3:2',
    note: 'Standard horizontal artwork. The storefront canvas uses a 3:2 ratio.',
    fallbackSizes: ['18 x 12', '24 x 16', '36 x 24', '48 x 32', '60 x 40'],
  },
  landscapeFourThree: {
    label: 'Landscape 4:3',
    note: 'Classic horizontal artwork. The storefront canvas uses a 4:3 ratio.',
    fallbackSizes: ['16 x 12', '24 x 18', '32 x 24', '48 x 36', '60 x 45'],
  },
  squareStandard: {
    label: 'Square',
    note: 'Square artwork. The storefront canvas uses a 1:1 ratio.',
    fallbackSizes: ['12 x 12', '16 x 16', '24 x 24', '30 x 30'],
  },
}

const catalogSizePresetsQuery = `coalesce(
  *[_id == "drafts.catalogSettings.default"][0].sizePresets,
  *[_id == "catalogSettings.default"][0].sizePresets
)`

const priceFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

function formatPrice(priceInCents?: number) {
  return typeof priceInCents === 'number'
    ? priceFormatter.format(priceInCents / 100)
    : ''
}

export function SizePresetInput(props: StringInputProps) {
  const client = useClient({apiVersion: '2025-05-21'})
  const usesCustomSizes = useFormValue(['useCustomSizeOptions']) === true
  const [catalogSizePresets, setCatalogSizePresets] = useState<Record<
    string,
    SizeOption[]
  > | null>(null)

  useEffect(() => {
    let cancelled = false

    void client
      .fetch<Record<string, SizeOption[]> | null>(
        catalogSizePresetsQuery,
        {},
        {perspective: 'raw'},
      )
      .then((result) => {
        if (!cancelled) setCatalogSizePresets(result)
      })
      .catch(() => {
        if (!cancelled) setCatalogSizePresets(null)
      })

    return () => {
      cancelled = true
    }
  }, [client])

  const selectedPreset = props.value ? sizePresetPreview[props.value] : null
  const configuredSizes = props.value ? catalogSizePresets?.[props.value] : undefined
  const sizes: SizeOption[] = configuredSizes?.length
    ? configuredSizes
    : selectedPreset?.fallbackSizes.map((label): SizeOption => ({label})) || []

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
            {usesCustomSizes ? (
              <div style={{color: 'var(--card-muted-fg-color)', fontSize: 12, marginTop: 8}}>
                Custom Size Options are enabled, so they override the shared sizes shown here.
              </div>
            ) : null}
            <div style={{display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10}}>
              {sizes.map((size, index) => {
                const price = formatPrice(size.priceInCents)

                return (
                  <div
                    key={size.id || `${size.label}-${index}`}
                    style={{
                      border: '1px solid var(--card-border-color)',
                      borderRadius: 4,
                      padding: '7px 9px',
                    }}
                  >
                    <div style={{fontSize: 12, fontWeight: 700}}>{size.label}</div>
                    {price ? (
                      <div style={{color: 'var(--card-muted-fg-color)', fontSize: 12}}>
                        {price}
                      </div>
                    ) : null}
                    {size.badge ? (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          marginTop: 3,
                          textTransform: 'uppercase',
                        }}
                      >
                        {size.badge}
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div style={{color: 'var(--card-muted-fg-color)', fontSize: 11, marginTop: 9}}>
              Prices come from Catalog Settings, not from this product.
            </div>
          </>
        ) : (
          <div style={{color: 'var(--card-muted-fg-color)', fontSize: 12}}>
            Pick one format. It controls both the canvas shape and its shared size set.
          </div>
        )}
      </div>
    </div>
  )
}
