import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateQuantitySchema } from "@/lib/schemas";
import { ZodError } from "zod";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const validated = updateQuantitySchema.parse(body);

    const variant = await prisma.productVariant.update({
      where: { id: validated.variantId },
      data: { quantity: Math.max(0, Math.floor(validated.quantity)) },
    });

    return NextResponse.json(variant);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.flatten() },
        { status: 400 }
      );
    }
    console.error("Failed to update variant:", error);
    return NextResponse.json(
      { error: "Failed to update quantity" },
      { status: 500 }
    );
  }
}
