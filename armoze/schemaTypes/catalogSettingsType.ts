import {defineArrayMember, defineField, defineType} from 'sanity'

const sizeOptionFields = [
  defineField({name: 'id', title: 'ID', type: 'string', validation: (rule) => rule.required()}),
  defineField({name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required()}),
  defineField({
    name: 'priceInCents',
    title: 'Price In Cents',
    type: 'number',
    description: '$75.00 should be entered as 7500.',
    validation: (rule) => rule.required().min(0),
  }),
  defineField({name: 'badge', title: 'Badge', type: 'string'}),
  defineField({
    name: 'previewScale',
    title: 'Preview Scale',
    type: 'number',
    description: 'Controls how much the first product mockup grows when this size is selected.',
  }),
]

const sizePresetField = (
  name: string,
  title: string,
  description: string,
  initialValue: Array<Record<string, string | number>>,
) =>
  defineField({
    name,
    title,
    type: 'array',
    description,
    of: [defineArrayMember({type: 'object', fields: sizeOptionFields})],
    initialValue,
    validation: (rule) => rule.required().min(1),
  })

export const catalogSettingsType = defineType({
  name: 'catalogSettings',
  title: 'Catalog Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Default catalog settings',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sizePresets',
      title: 'Global Size Pricing',
      type: 'object',
      description:
        'Edit these once to update every product using the matching Size Preset. Product-specific Custom Size Options only apply when a product has Use Custom Size Options turned on.',
      fields: [
        sizePresetField('landscapeWide', 'Landscape 2:1', 'For sizes like 20 x 10, 30 x 15, and 60 x 30.', [
          {id: '20x10', label: '20 x 10', priceInCents: 4999, previewScale: 0.94},
          {id: '30x15', label: '30 x 15', priceInCents: 8499, previewScale: 1},
          {id: '40x20', label: '40 x 20', priceInCents: 11499, previewScale: 1.08},
          {id: '48x24', label: '48 x 24', priceInCents: 14999, badge: 'Best Value', previewScale: 1.16},
          {id: '60x30', label: '60 x 30', priceInCents: 28499, badge: 'Museum', previewScale: 1.22},
        ]),
        sizePresetField('portraitTwoThree', 'Portrait 2:3', 'For sizes like 12 x 18, 16 x 24, and 24 x 36.', [
          {id: '12x18', label: '12 x 18', priceInCents: 4999, previewScale: 0.94},
          {id: '16x24', label: '16 x 24', priceInCents: 6499, previewScale: 1},
          {id: '24x36', label: '24 x 36', priceInCents: 8499, badge: 'Best Value', previewScale: 1.08},
          {id: '32x48', label: '32 x 48', priceInCents: 16999, previewScale: 1.15},
          {id: '40x60', label: '40 x 60', priceInCents: 29499, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('portraitThreeFour', 'Portrait 3:4', 'For sizes like 12 x 16, 18 x 24, and 24 x 32.', [
          {id: '12x16', label: '12 x 16', priceInCents: 4900, previewScale: 0.94},
          {id: '18x24', label: '18 x 24', priceInCents: 8400, previewScale: 1},
          {id: '24x32', label: '24 x 32', priceInCents: 11400, badge: 'Best Value', previewScale: 1.08},
          {id: '36x48', label: '36 x 48', priceInCents: 19900, previewScale: 1.15},
          {id: '45x60', label: '45 x 60', priceInCents: 27400, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('landscapeThreeTwo', 'Landscape 3:2', 'For sizes like 18 x 12, 24 x 16, and 36 x 24.', [
          {id: '18x12', label: '18 x 12', priceInCents: 4999, previewScale: 0.94},
          {id: '24x16', label: '24 x 16', priceInCents: 6499, previewScale: 1},
          {id: '36x24', label: '36 x 24', priceInCents: 8499, badge: 'Best Value', previewScale: 1.08},
          {id: '48x32', label: '48 x 32', priceInCents: 16999, badge: 'Popular', previewScale: 1.14},
          {id: '60x40', label: '60 x 40', priceInCents: 32499, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('landscapeFourThree', 'Landscape 4:3', 'For sizes like 16 x 12, 24 x 18, and 32 x 24.', [
          {id: '16x12', label: '16 x 12', priceInCents: 5500, previewScale: 0.94},
          {id: '24x18', label: '24 x 18', priceInCents: 9400, previewScale: 1},
          {id: '32x24', label: '32 x 24', priceInCents: 12400, badge: 'Best Value', previewScale: 1.08},
          {id: '48x36', label: '48 x 36', priceInCents: 19900, previewScale: 1.15},
          {id: '60x45', label: '60 x 45', priceInCents: 27400, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('squareStandard', 'Square Standard', 'For sizes like 12 x 12, 16 x 16, and 24 x 24.', [
          {id: '12x12', label: '12 x 12', priceInCents: 3500, previewScale: 0.94},
          {id: '16x16', label: '16 x 16', priceInCents: 5400, previewScale: 1},
          {id: '24x24', label: '24 x 24', priceInCents: 3900, badge: 'Best Value', previewScale: 1.08},
          {id: '30x30', label: '30 x 30', priceInCents: 2900, badge: 'Popular', previewScale: 1.14},
        ]),
      ],
    }),
    defineField({
      name: 'defaultProductVideo',
      title: 'Default Product Video',
      type: 'object',
      description:
        'Shown after all product images on every product page and included in Google Merchant Center for every product.',
      fields: [
        defineField({name: 'title', title: 'Title', type: 'string'}),
        defineField({
          name: 'videoFile',
          title: 'Video File',
          type: 'file',
          description: 'Upload the shared MP4, WebM, or MOV product video.',
          options: {accept: 'video/mp4,video/webm,video/quicktime'},
        }),
        defineField({
          name: 'videoUrl',
          title: 'Video URL',
          type: 'url',
          description: 'Optional direct video URL if the file is hosted somewhere else.',
        }),
        defineField({
          name: 'thumbnail',
          title: 'Video Thumbnail',
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Alt Text', type: 'string'})],
        }),
      ],
      preview: {
        select: {title: 'title', media: 'thumbnail'},
        prepare(selection) {
          return {title: selection.title || 'Default product video', media: selection.media}
        },
      },
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
