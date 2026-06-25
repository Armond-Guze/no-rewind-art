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

const heroImageField = (
  name: string,
  title: string,
  description: string,
  recommendedSize: string,
) =>
  defineField({
    name,
    title,
    type: 'image',
    description: `${description} Recommended Photoshop export: ${recommendedSize}. This is separate from product images.`,
    options: {hotspot: true},
    fields: [
      defineField({
        name: 'alt',
        title: 'Alt Text',
        type: 'string',
        description: 'Describe the room/mockup image for accessibility and SEO.',
      }),
    ],
  })

const mobileImageCarouselField = (name: string, title: string, description: string, maxItems: number) =>
  defineField({
    name,
    title,
    type: 'array',
    description,
    of: [
      defineArrayMember({
        type: 'image',
        title: 'Image',
        options: {hotspot: true},
        fields: [
          defineField({
            name: 'alt',
            title: 'Alt Text',
            type: 'string',
            description: 'Describe this mobile carousel image for accessibility.',
          }),
        ],
      }),
    ],
    validation: (rule) => rule.max(maxItems),
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
    heroImageField(
      'heroMobileImage',
      'Mobile Hero Image',
      'Optional full-screen mobile homepage image. Use this for vertical room mockups shown behind the mobile headline.',
      '1170 x 2532 px',
    ),
    heroImageField(
      'heroDesktopImage',
      'Desktop Hero Image',
      'Optional desktop homepage hero image. Use this when you want the desktop hero visual to be independent from products.',
      '2880 x 1800 px',
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
    mobileImageCarouselField(
      'newArrivalMobileImages',
      'Mobile New Arrivals Image Slider',
      'Pick up to 5 standalone images for the mobile-only sliding image strip under New Arrivals. If empty, the storefront uses the selected New Arrivals product images.',
      5,
    ),
  ],
  preview: {
    select: {
      title: 'title',
    },
  },
})
