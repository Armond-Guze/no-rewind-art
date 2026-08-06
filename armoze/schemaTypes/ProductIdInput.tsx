import {getPublishedId, useEditState, useFormValue, type StringInputProps} from 'sanity'

export function ProductIdInput(props: StringInputProps) {
  const documentId = useFormValue(['_id'])
  const documentType = useFormValue(['_type'])
  const publishedId = typeof documentId === 'string' ? getPublishedId(documentId) : ''
  const editState = useEditState(
    publishedId,
    typeof documentType === 'string' ? documentType : 'artworkProduct',
  )
  const isLocked = Boolean(editState.published?.productId)

  return props.renderDefault({...props, readOnly: props.readOnly || isLocked})
}
