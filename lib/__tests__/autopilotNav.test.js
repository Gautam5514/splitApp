// Tips open Autopilot with their draft; other links are left alone.
jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
const { router } = require("expo-router");
const { openAutopilot, openAutopilotFromLink } = require("../autopilotNav");

beforeEach(() => router.push.mockClear());
test("a tip link opens Autopilot with the suggested draft", () => {
  expect(openAutopilotFromLink("/dashboard?autopilot=1&prompt=Rent%20paid%20by%20me%2C%20split%20equally")).toBe(true);
  expect(router.push).toHaveBeenCalledWith({ pathname: "/autopilot", params: expect.objectContaining({ prompt: "Rent paid by me, split equally" }) });
});
test("ordinary links are not taken over", () => {
  expect(openAutopilotFromLink("/groups/abc")).toBe(false);
  expect(openAutopilotFromLink(undefined)).toBe(false);
  expect(router.push).not.toHaveBeenCalled();
});
test("opening inside a group passes the group", () => {
  openAutopilot({ groupId: "g1" });
  expect(router.push.mock.calls[0][0].params).toMatchObject({ groupId: "g1" });
});
