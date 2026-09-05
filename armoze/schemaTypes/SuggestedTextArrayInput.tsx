import {useCallback, useEffect, useMemo, useRef} from 'react'
import {
  PatchEvent,
  set,
  useFormValue,
  type ArrayOfPrimitivesInputProps,
} from 'sanity'
import {
  buildDefaultArtworkHighlights,
  buildDefaultSeoAliases,
  isGeneratedSeoAliases,
} from '../../shared/product-content.js'

function arraysMatch(left: string[], right: string[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function getStringValues(value: ArrayOfPrimitivesInputProps['value']) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function SuggestedTextArrayInput({
  props,
  suggestions,
  helpText,
  refreshLabel,
  canRefreshGeneratedValue,
}: {
  props: ArrayOfPrimitivesInputProps
  suggestions: string[]
  helpText: string
  refreshLabel: string
  canRefreshGeneratedValue?: (values: string[]) => boolean
}) {
  const {onChange, readOnly, value} = props
  const previousSuggestions = useRef(suggestions)
  const suggestionKey = suggestions.join('\u0000')
  const values = getStringValues(value)
  const valueKey = values.join('\u0000')

  useEffect(() => {
    const previous = previousSuggestions.current
    const shouldAutoFill =
      values.length === 0 ||
      arraysMatch(values, previous) ||
      canRefreshGeneratedValue?.(values) === true
    previousSuggestions.current = suggestions

    if (!readOnly && shouldAutoFill && !arraysMatch(values, suggestions)) {
      onChange(PatchEvent.from(set(suggestions)))
    }
  }, [canRefreshGeneratedValue, onChange, readOnly, suggestionKey, suggestions, valueKey, values])

  const matchesSuggestions = arraysMatch(values, suggestions)

  return (
    <div>
      {props.renderDefault(props)}
      <div
        style={{
          alignItems: 'center',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          justifyContent: 'space-between',
          marginTop: 10,
        }}
      >
        <span style={{color: 'var(--card-muted-fg-color)', flex: '1 1 260px', fontSize: 12}}>
          {helpText}
        </span>
        <button
          type="button"
          disabled={readOnly || matchesSuggestions}
          onClick={() => onChange(PatchEvent.from(set(suggestions)))}
          style={{
            background: 'var(--card-bg-color)',
            border: '1px solid var(--card-border-color)',
            borderRadius: 4,
            color: 'inherit',
            cursor: readOnly || matchesSuggestions ? 'default' : 'pointer',
            font: 'inherit',
            fontSize: 12,
            opacity: readOnly || matchesSuggestions ? 0.55 : 1,
            padding: '6px 9px',
          }}
        >
          {refreshLabel}
        </button>
      </div>
    </div>
  )
}

export function SeoAliasesInput(props: ArrayOfPrimitivesInputProps) {
  const tone = useFormValue(['tone'])
  const title = useFormValue(['title'])
  const suggestions = useMemo(() => buildDefaultSeoAliases(tone, title), [title, tone])
  const canRefreshGeneratedValue = useCallback(
    (values: string[]) => isGeneratedSeoAliases(values, title),
    [title],
  )

  return (
    <SuggestedTextArrayInput
      props={props}
      suggestions={suggestions}
      helpText="Filled automatically from the product title and Artwork Theme. Manual edits are preserved."
      refreshLabel="Reset to suggested phrases"
      canRefreshGeneratedValue={canRefreshGeneratedValue}
    />
  )
}

export function ArtworkHighlightsInput(props: ArrayOfPrimitivesInputProps) {
  const tone = useFormValue(['tone'])
  const suggestions = useMemo(() => buildDefaultArtworkHighlights(tone), [tone])

  return (
    <SuggestedTextArrayInput
      props={props}
      suggestions={suggestions}
      helpText="These product-specific highlights appear on the product page. Shared material and shipping facts are added automatically."
      refreshLabel="Reset to theme suggestions"
    />
  )
}
