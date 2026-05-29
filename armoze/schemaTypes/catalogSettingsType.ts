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
          {id: '24x12', label: '20 x 10', priceInCents: 7500, previewScale: 0.94},
          {id: '30x15', label: '30 x 15', priceInCents: 9500, previewScale: 1},
          {id: '40x20', label: '40 x 20', priceInCents: 11500, previewScale: 1.08},
          {id: '48x20', label: '48 x 24', priceInCents: 13500, badge: 'Best Value', previewScale: 1.16},
          {id: '60x30', label: '60 x 30', priceInCents: 16500, badge: 'Museum', previewScale: 1.22},
        ]),
        sizePresetField('portraitTwoThree', 'Portrait 2:3', 'For sizes like 12 x 18, 16 x 24, and 24 x 36.', [
          {id: '12x18', label: '12 x 18', priceInCents: 7500, previewScale: 0.94},
          {id: '16x24', label: '16 x 24', priceInCents: 9500, previewScale: 1},
          {id: '24x36', label: '24 x 36', priceInCents: 11500, badge: 'Best Value', previewScale: 1.08},
          {id: '32x48', label: '32 x 48', priceInCents: 13500, previewScale: 1.15},
          {id: '40x60', label: '40 x 60', priceInCents: 19500, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('portraitThreeFour', 'Portrait 3:4', 'For sizes like 12 x 16, 18 x 24, and 24 x 32.', [
          {id: '12x16', label: '12 x 16', priceInCents: 6500, previewScale: 0.94},
          {id: '18x24', label: '18 x 24', priceInCents: 9500, previewScale: 1},
          {id: '24x32', label: '24 x 32', priceInCents: 12500, badge: 'Best Value', previewScale: 1.08},
          {id: '36x48', label: '36 x 48', priceInCents: 19500, previewScale: 1.15},
          {id: '45x60', label: '45 x 60', priceInCents: 22500, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('landscapeThreeTwo', 'Landscape 3:2', 'For sizes like 18 x 12, 24 x 16, and 36 x 24.', [
          {id: '18x12', label: '18 x 12', priceInCents: 7500, previewScale: 0.94},
          {id: '24x16', label: '24 x 16', priceInCents: 9500, previewScale: 1},
          {id: '36x24', label: '36 x 24', priceInCents: 11500, badge: 'Best Value', previewScale: 1.08},
          {id: '42x28', label: '48 x 32', priceInCents: 15500, badge: 'Popular', previewScale: 1.14},
          {id: '60x40', label: '60 x 40', priceInCents: 19500, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('landscapeFourThree', 'Landscape 4:3', 'For sizes like 16 x 12, 24 x 18, and 32 x 24.', [
          {id: '16x12', label: '16 x 12', priceInCents: 6500, previewScale: 0.94},
          {id: '24x18', label: '24 x 18', priceInCents: 9500, previewScale: 1},
          {id: '32x24', label: '32 x 24', priceInCents: 12500, badge: 'Best Value', previewScale: 1.08},
          {id: '48x36', label: '48 x 36', priceInCents: 19500, previewScale: 1.15},
          {id: '60x45', label: '60 x 45', priceInCents: 22500, badge: 'Statement', previewScale: 1.21},
        ]),
        sizePresetField('squareStandard', 'Square Standard', 'For sizes like 12 x 12, 16 x 16, and 24 x 24.', [
          {id: '12x12', label: '12 x 12', priceInCents: 4500, previewScale: 0.94},
          {id: '16x16', label: '16 x 16', priceInCents: 6500, previewScale: 1},
          {id: '24x24', label: '24 x 24', priceInCents: 9900, badge: 'Best Value', previewScale: 1.08},
          {id: '30x30', label: '30 x 30', priceInCents: 12900, badge: 'Popular', previewScale: 1.14},
        ]),
      ],
    }),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
