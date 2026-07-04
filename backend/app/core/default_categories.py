from typing import TypedDict


class DefaultCategory(TypedDict):
    name: str
    description: str
    icon: str
    price_label: str | None


DEFAULT_SERVICE_CATEGORIES: list[DefaultCategory] = [
    {
        "name": "Electrician",
        "description": "Electrical repair, wiring, switchboards, fans, and lights.",
        "icon": "zap",
        "price_label": "Starts at INR 199",
    },
    {
        "name": "Plumber",
        "description": "Leakage, taps, fittings, pipes, and bathroom repairs.",
        "icon": "droplet",
        "price_label": "Starts at INR 199",
    },
    {
        "name": "Carpenter",
        "description": "Furniture repair, fittings, doors, and woodwork.",
        "icon": "hammer",
        "price_label": "Starts at INR 249",
    },
    {
        "name": "Painter",
        "description": "Home painting, touch-ups, and wall finishing.",
        "icon": "paint-roller",
        "price_label": "Starts at INR 499",
    },
    {
        "name": "AC Repair",
        "description": "AC servicing, cooling issues, installation, and repair.",
        "icon": "snowflake",
        "price_label": "Starts at INR 299",
    },
    {
        "name": "Appliance Repair",
        "description": "Washing machine, fridge, RO, geyser, and appliance fixes.",
        "icon": "settings",
        "price_label": "Starts at INR 249",
    },
    {
        "name": "House Cleaning",
        "description": "Home deep cleaning, kitchen, bathroom, and regular cleaning.",
        "icon": "sparkles",
        "price_label": "Starts at INR 399",
    },
    {
        "name": "Driver",
        "description": "Local driving support and transport help.",
        "icon": "car",
        "price_label": "Starts at INR 399",
    },
    {
        "name": "Tutor",
        "description": "Home tutors and learning support.",
        "icon": "book-open",
        "price_label": "Starts at INR 299/class",
    },
    {
        "name": "Event Staff",
        "description": "Event helpers, support staff, and local event services.",
        "icon": "users",
        "price_label": "Starts at INR 699",
    },
    {
        "name": "Other Service",
        "description": "Other local services not listed above.",
        "icon": "more-horizontal",
        "price_label": None,
    },
]

DEFAULT_PRICE_LABEL_BY_NAME = {
    category["name"]: category["price_label"] for category in DEFAULT_SERVICE_CATEGORIES
}

DEFAULT_PRICE_LABEL_BY_SLUG = {
    category["name"].lower().replace(" ", "-"): category["price_label"]
    for category in DEFAULT_SERVICE_CATEGORIES
}
