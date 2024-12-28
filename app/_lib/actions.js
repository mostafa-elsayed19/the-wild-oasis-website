"use server";

import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "./auth";
import {
  createBooking,
  deleteBooking,
  getBookings,
  updateBooking,
  updateGuest,
} from "./data-service";
import { redirect } from "next/navigation";

async function session() {
  const session = await auth();
  if (!session) throw new Error("You must be logged in");

  return session;
}

export async function signInAction() {
  await signIn("google", { redirectTo: "/account" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function updateProfileAction(formData) {
  // const session = await auth();
  // if (!session) throw new Error("You must be logged in");

  const userSession = await session();

  const nationalID = formData.get("nationalID");
  const [nationality, countryFlag] = formData.get("nationality").split("%");

  if (!/^[a-zA-Z0-9]{6,12}$/.test(nationalID))
    throw new Error("Please provide a valid national ID");

  const updateData = { nationalID, nationality, countryFlag };

  await updateGuest(userSession.user.guestId, updateData);

  revalidatePath("/account/profile");
}

export async function deleteBookingAction(bookingId) {
  const userSession = await session();

  const guestBookings = await getBookings(userSession.user.guestId);

  const guestBookingsIds = guestBookings.map((booking) => booking.id);

  if (!guestBookingsIds.includes(bookingId))
    throw new Error("You are not allowed to delete this reservation");

  await deleteBooking(bookingId);

  revalidatePath("/account/reservations");
}

export async function updateBookingAction(formData) {
  const userSession = await session();

  const guestBookings = await getBookings(userSession.user.guestId);

  const guestBookingsIds = guestBookings.map((booking) => booking.id);

  const bookingId = Number(formData.get("bookingId"));

  if (!guestBookingsIds.includes(bookingId))
    throw new Error("You are not allowed to edit this reservation");

  const updatedData = {
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations").slice(0, 1000),
  };

  await updateBooking(bookingId, updatedData);

  revalidatePath(`/account/reservations/edit/${bookingId}`);

  redirect("/account/reservations");
}

export async function createBookingAction(bookingData, formData) {
  const userSession = await session();

  const { cabinId } = bookingData;

  const newBooking = {
    ...bookingData,
    guestId: userSession.user.guestId,
    numGuests: Number(formData.get("numGuests")),
    observations: formData.get("observations"),
    extrasPrice: 0,
    totalPrice: bookingData.cabinPrice,
    isPaid: false,
    hasBreakfast: false,
  };

  await createBooking(newBooking);

  revalidatePath(`/cabins/${cabinId}`);

  redirect("/cabins/thankyou");
}
