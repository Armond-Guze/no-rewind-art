import {defineArrayMember, defineField, defineType} from 'sanity'
import {SizePresetInput} from './SizePresetInput'

const sizeOptionFields = [
  defineField({name: 'id', title: 'ID', type: 'string', validation: (rule) => rule.required()}),
  defineField({name: 'label', title: 'Label', type: 'string', validation: (rule) => rule.required()}),
  defineField({
    name: 'priceInCents',
    title: 'Price In Cents',
    type: 'number',
    validation: (rule) => rule.required().min(0),
  }),
  defineField({name: 'badge', title: 'Badge', type: 'string'}),
  defineField({name: 'previewScale', title: 'Preview Scale', type: 'number'}),
]

export const artworkProductType = defineType({
  name: 'artworkProduct',
  title: 'Artwork Product',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'productId',
      title: 'Product ID',
      type: 'string',
      description: 'Stable storefront/cart ID, like life-has-no-rewind-canvas.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description:
        'Changing the title will not automatically change this after the product exists. Click Generate or edit this when you want the storefront URL to change.',
      options: {source: 'title'},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'previousSlugs',
      title: 'Previous Slugs',
      type: 'array',
      description:
        'Add old slug values here when changing a product URL. Example: old-artwork-name. The storefront will redirect old URLs to the current slug.',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({
      name: 'published',
      title: 'Published',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      description:
        'Optional manual storefront order. Lower numbers show first. If two products match, the site falls back to title order.',
      initialValue: 100,
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'longDescription',
      title: 'Long Description',
      type: 'text',
      rows: 5,
      validation: (rule) => rule.required(),
    }),
    defineField({name: 'label', title: 'Visual Label', type: 'string'}),
    defineField({
      name: 'mainImage',
      title: 'Main Image',
      type: 'image',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
          validation: (rule) => rule.required(),
        }),
      ],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'imageAlt',
      title: 'Fallback Image Alt Text',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'galleryImages',
      title: 'Gallery Images',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [defineField({name: 'alt', title: 'Alt Text', type: 'string'})],
        }),
      ],
    }),
    defineField({
      name: 'tone',
      title: 'Tone',
      type: 'string',
      options: {
        list: [
          {title: 'Cassette', value: 'cassette'},
          {title: 'Focus', value: 'focus'},
          {title: 'Space', value: 'space'},
          {title: 'Money', value: 'money'},
          {title: 'Minimal', value: 'minimal'},
        ],
      },
      initialValue: 'minimal',
    }),
    defineField({
      name: 'collectionSlugs',
      title: 'Collection Slugs',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({name: 'priceInCents', title: 'Base Price In Cents', type: 'number'}),
    defineField({name: 'size', title: 'Product Type Label', type: 'string', initialValue: 'Canvas print'}),
    defineField({
      name: 'sizePreset',
      title: 'Size Preset',
      type: 'string',
      description:
        'Choose the artwork ratio. This controls the five size buttons, prices, and product mockup shape automatically.',
      options: {
        list: [
          {title: 'Landscape 2:1', value: 'landscapeWide'},
          {title: 'Portrait 2:3', value: 'portraitTwoThree'},
          {title: 'Landscape 3:2', value: 'landscapeThreeTwo'},
          {title: 'Landscape 4:3', value: 'landscapeFourThree'},
          {title: 'Square Standard', value: 'squareStandard'},
        ],
      },
      components: {input: SizePresetInput},
      initialValue: 'landscapeWide',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'aspectRatio',
      title: 'Canvas Aspect Ratio',
      type: 'string',
      description:
        'Controls the visible canvas shape on the website. Use width / height, for example 2 / 1, 3 / 2, 2 / 3, or 1 / 1.',
      options: {
        list: [
          {title: '1 / 1 Square', value: '1 / 1'},
          {title: '2 / 1 Panoramic', value: '2 / 1'},
          {title: '3 / 2 Landscape', value: '3 / 2'},
          {title: '4 / 3 Landscape', value: '4 / 3'},
          {title: '4 / 5 Portrait', value: '4 / 5'},
          {title: '2 / 3 Portrait', value: '2 / 3'},
        ],
      },
    }),
    defineField({
      name: 'useCustomSizeOptions',
      title: 'Use Custom Size Options',
      type: 'boolean',
      description:
        'Leave off for normal products so this artwork uses the shared prices from Catalog Settings. Turn on only when this product needs its own sizes or prices.',
      initialValue: false,
    }),
    defineField({
      name: 'sizeOptions',
      title: 'Custom Size Options',
      type: 'array',
      description:
        'Only used when Use Custom Size Options is turned on. Otherwise the storefront uses the Size Preset prices from Catalog Settings.',
      hidden: ({document}) => document?.useCustomSizeOptions !== true,
      of: [defineArrayMember({type: 'object', fields: sizeOptionFields})],
    }),
    defineField({name: 'rating', title: 'Rating', type: 'number'}),
    defineField({name: 'reviewCount', title: 'Review Count', type: 'number'}),
    defineField({
      name: 'details',
      title: 'Product Details',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
    }),
    defineField({name: 'seoTitle', title: 'SEO Title', type: 'string'}),
    defineField({name: 'seoDescription', title: 'SEO Description', type: 'text', rows: 2}),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'productId',
      media: 'mainImage',
    },
  },
})
