export const defaultServices = [
  { name: "Electrician", priceLabel: "Starts at INR 199" },
  { name: "Plumber", priceLabel: "Starts at INR 199" },
  { name: "Carpenter", priceLabel: "Starts at INR 249" },
  { name: "Painter", priceLabel: "Starts at INR 499" },
  { name: "AC Repair", priceLabel: "Starts at INR 299" },
  { name: "Appliance Repair", priceLabel: "Starts at INR 249" },
  { name: "House Cleaning", priceLabel: "Starts at INR 399" },
  { name: "Driver", priceLabel: "Starts at INR 399" },
  { name: "Tutor", priceLabel: "Starts at INR 299/class" },
  { name: "Event Staff", priceLabel: "Starts at INR 699" },
  { name: "Other Service", priceLabel: "Custom quote" }
];

export const defaultServiceCategories = defaultServices.map((service) => service.name);

export function getDefaultServicePriceLabel(serviceName: string): string {
  return defaultServices.find((service) => service.name === serviceName)?.priceLabel ?? "Custom quote";
}
