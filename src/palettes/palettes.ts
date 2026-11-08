export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export const PALETTES: Palette[] = [
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#FCE8D5', '#FFCDB2', '#F9D5A7', '#F7B267', '#F79D65', '#F4845F', '#F27059', '#E56B6F', '#E5989B', '#EAAC8B', '#B56576', '#6D597A', '#355070', '#2B2D42'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#EDF6F9', '#E0F7FA', '#CDE7E3', '#B2EBF2', '#83C5BE', '#80DEEA', '#4DD0E1', '#5E9FA3', '#26A69A', '#00897B', '#006D77', '#98C1D9', '#3D5A80', '#293241'],
  },
  {
    id: 'ankara',
    name: 'Earthy Ankara',
    colors: ['#F2CC8F', '#E9C46A', '#D9A441', '#F4A261', '#E76F51', '#C8553D', '#9C4221', '#8D5524', '#81B29A', '#2A9D8F', '#1F7A8C', '#264653', '#5B2A86', '#3D405B'],
  },
  {
    id: 'pastel',
    name: 'Pastel Dreams',
    colors: ['#FCE1E4', '#FFD6E0', '#F3C4D6', '#FFDAC1', '#FFEFCF', '#F6E7CB', '#E2F0CB', '#CDE5D7', '#B5EAD7', '#DDEDEA', '#D4F1F4', '#BFD7EA', '#C7CEEA', '#E8D3FF'],
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: ['#E6CCB2', '#DDB892', '#DAD7CD', '#B08968', '#A3B18A', '#8A9A5B', '#588157', '#606C38', '#3A5A40', '#344E41', '#283618', '#BC6C25', '#7F5539', '#4F6D7A'],
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    colors: ['#FAEDCD', '#FFF3B0', '#FFE29A', '#FFC857', '#F6AE2D', '#F28F3B', '#E07A5F', '#C8553D', '#9E2A2B', '#F4D6CC', '#FFB4A2', '#D4A373', '#E9EDC9', '#CCD5AE'],
  },
  {
    id: 'night',
    name: 'Night Sky',
    colors: ['#F7F3E3', '#F2E9E4', '#FFD166', '#C3BEF7', '#6FFFE9', '#5BC0BE', '#9A8C98', '#7A6C9D', '#4B3F72', '#3A506B', '#2E1A47', '#1C2541', '#22223B', '#0B132B'],
  },
  {
    id: 'clay',
    name: 'Clay & Sand',
    colors: ['#FBF5EF', '#F1E3D3', '#E8D5C4', '#D6B89C', '#C9A27E', '#B5835A', '#A0674B', '#8C4B3A', '#6B3E2E', '#D9C5B2', '#A89F91', '#7D7461', '#556052', '#3E3B36'],
  },
];
