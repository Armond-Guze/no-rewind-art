import {defineArrayMember, defineField, defineType} from 'sanity'

const productReferenceList = (name: string, title: string, description: string, maxItems: number) =>
  defineField({
    name,
    title,
    type: 'array',
    description,
    of: [
      defineArrayMember({
        type: 'reference',
        to: [{type: 'artworkProduct'}],
      }),
    ],
    validation: (rule) =>
      rule
        .unique()
        .max(maxItems)
        .custom((items) => {
          if (!Array.isArray(items)) {
            return true
          }

          const refs = items.map((item) => item?._ref).filter(Boolean)
          return refs.length === new Set(refs).size ? true : 'Each product can only be selected once.'
        }),
  })

export const homepageSettingsType = defineType({
  name: 'homepageSettings',
  title: 'Homepage Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      initialValue: 'Homepage settings',
      validation: (rule) => rule.required(),
    }),
    productReferenceList(
      'heroProducts',
      'Hero Slideshow Products',
      'Pick up to 5 products for the large homepage slideshow, in the exact order they should rotate.',
      5,
    ),
    productReferenceList(
      'bestSellerProducts',
      'Homepage Best Sellers',
      'Pick up to 8 products for the homepage Best Sellers section, in the exact order they should show.',
      8,
    ),
    productReferenceList(
      'newArrivalProducts',
      'Homepage New Arrivals',
      'Pick up to 4 products for the homepage New Arrivals section. Products picked as Best Sellers are hidden from this section on the storefront.',
      4,
    ),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
