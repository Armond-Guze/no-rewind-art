import {defineConfig} from 'sanity'
import {structureTool, type StructureResolver} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

const singletonTypes = new Set(['catalogSettings', 'homepageSettings'])

const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .title('Homepage Settings')
        .schemaType('homepageSettings')
        .child(S.document().schemaType('homepageSettings').documentId('homepageSettings.default')),
      S.listItem()
        .title('Catalog Settings')
        .schemaType('catalogSettings')
        .child(S.document().schemaType('catalogSettings').documentId('catalogSettings.default')),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => !singletonTypes.has(item.getId() || '')),
    ])

export default defineConfig({
  name: 'default',
  title: 'Armoze',

  projectId: 'os8xckqo',
  dataset: 'production',

  plugins: [structureTool({structure}), visionTool()],

  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter((template) => !singletonTypes.has(template.schemaType)),
  },
})
